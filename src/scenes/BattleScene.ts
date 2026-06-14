// src/scenes/BattleScene.ts
// V0.1: Battlefield rendering + AutoBattleSystem combat loop.

import Phaser from 'phaser';
import { CANVAS, COMBAT, FORMATION, UI, WAVES } from '../constants/gameConfig';
import { getEnemyColor, getEnemyDisplayName } from '../data/enemies';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import { buildDefaultRealmV3 } from '../save/defaults/buildDefaultRealmV3';
import { createBattleGameState } from '../store/GameState';
import { AutoBattleSystem } from '../systems/AutoBattleSystem';
import { EnemyCombatSystem } from '../systems/EnemyCombatSystem';
import { assignCombatSlotIndices, FormationSystem, getHeroBattlePosition } from '../systems/FormationSystem';
import { computeHeroStats } from '../systems/HeroProgressionSystem';
import { computeStageReward } from '../systems/RewardSystem';
import { buildArenaWaveConfig } from '../systems/ArenaMatchSystem';
import { getStageData } from '../systems/StageLoader';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { UltimateSystem } from '../systems/UltimateSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BossBar } from '../ui/BossBar';
import { drawEnergyBar } from '../ui/EnergyBar';
import { UltimateButtons, type HudPortraitConfig } from '../ui/UltimateButtons';
import type {
  BattleHero,
  EnemyRuntimeState,
  GameState,
  HeroClass,
  HeroLineupEntry,
  HeroRuntimeState,
  RealmSaveDataV3,
} from '../types';

interface HeroSetupEntry {
  id: string;
  name: string;
  heroClass: HeroClass;
  color: number;
  radius: number;
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  attackCooldown: number;
  attackRange: number;
  moveSpeed: number;
}

interface UnitVisual {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Graphics;
  energyBar?: Phaser.GameObjects.Graphics;
}

interface WaveEnemiesSpawnedPayload {
  waveIndex: number;
  waveNumber: number;
  isBossWave: boolean;
  enemies: EnemyRuntimeState[];
}

interface BossHpPayload {
  bossHp: number;
  bossMaxHp: number;
  visible: boolean;
}

const FORMATION_STORAGE_KEY = 'riftbound_mvp_formation';
const LINEUP_SLOT_COUNT = 4;
const DEFAULT_LINEUP_HERO_IDS = ['kael', 'sura', 'mira', 'nyra'];

function readRawFormationSlots(): (string | null)[] | null {
  try {
    const raw = localStorage.getItem(FORMATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== LINEUP_SLOT_COUNT) return null;
    return parsed.map((entry) => (
      typeof entry === 'string' && entry.length > 0 ? entry : null
    ));
  } catch {
    return null;
  }
}

function isCompleteLineup(heroIds: string[]): boolean {
  return heroIds.length === LINEUP_SLOT_COUNT && new Set(heroIds).size === LINEUP_SLOT_COUNT;
}

function resolveBattleLineupHeroIds(sceneFormation?: (string | null)[] | null): string[] {
  if (sceneFormation && sceneFormation.length === LINEUP_SLOT_COUNT) {
    const heroIds = sceneFormation.filter((slot): slot is string => slot !== null);
    if (isCompleteLineup(heroIds) && heroIds.every((id) => HEROES_DATA.some((hero) => hero.id === id))) {
      return heroIds;
    }
  }

  const rawSlots = readRawFormationSlots();
  if (rawSlots) {
    const heroIds = rawSlots.filter((slot): slot is string => slot !== null);
    if (isCompleteLineup(heroIds) && heroIds.every((id) => HEROES_DATA.some((hero) => hero.id === id))) {
      return heroIds;
    }
  }

  const realm = loadCurrentRealm();
  if (realm) {
    const heroIds = realm.currentFormation.slots
      .map((slot) => slot.assignedHeroId)
      .filter((id): id is string => !!id);
    if (isCompleteLineup(heroIds) && heroIds.every((id) => HEROES_DATA.some((hero) => hero.id === id))) {
      return heroIds;
    }
  }

  return [...DEFAULT_LINEUP_HERO_IDS];
}

function buildHeroSetupEntry(heroId: string): HeroSetupEntry | null {
  const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
  if (!heroData) return null;

  const stats = computeHeroStats(heroId);
  return {
    id: heroData.id,
    name: heroData.name,
    heroClass: heroData.heroClass,
    color: heroData.color,
    radius: heroData.radius,
    baseHP: stats?.hp ?? heroData.baseHP,
    baseAttack: stats?.attack ?? heroData.baseAttack,
    baseDefense: stats?.defense ?? heroData.baseDefense,
    attackCooldown: heroData.attackCooldown,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    moveSpeed: heroData.moveSpeed,
  };
}

function getHeroDisplayName(heroId: string): string {
  return HEROES_DATA.find((hero) => hero.id === heroId)?.name ?? 'Unknown';
}

export class BattleScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.BATTLE;

  private stageId = 'stage_1_1';
  private arenaOpponentId: string | null = null;
  private sceneFormation: (string | null)[] | null = null;
  private energyCost = 0;
  private heroesDeathCount = 0;

  private battleBackground!: Phaser.GameObjects.Rectangle;
  private waveLabel!: Phaser.GameObjects.Text;

  private heroes: BattleHero[] = [];
  private enemies: EnemyRuntimeState[] = [];
  private heroVisuals = new Map<string, UnitVisual>();
  private enemyVisuals = new Map<string, UnitVisual>();

  private gameState!: GameState;
  private autoBattle!: AutoBattleSystem;
  private enemyCombat!: EnemyCombatSystem;
  private waveSystem!: WaveSystem;
  private formationSystem!: FormationSystem;
  private ultimateSystem!: UltimateSystem;
  private ultimateButtons!: UltimateButtons;
  private bossBar!: BossBar;
  private combatActive = false;
  private battleEnded = false;
  private battleLoopActive = false;
  private readonly processedEnemyKills = new Set<string>();
  private readonly heroAliveSnapshot = new Map<string, boolean>();
  private readonly combatSlotByHeroId = new Map<string, number>();

  private readonly onFormationReady = (): void => {
    this.combatActive = true;
  };

  private readonly onWaveEnemiesReady = (): void => {
    this.combatActive = true;
  };

  private readonly onEnemyKilled = (instanceId: string): void => {
    if (this.processedEnemyKills.has(instanceId)) return;
    this.processedEnemyKills.add(instanceId);

    const enemy = this.enemies.find((unit) => unit.instanceId === instanceId);
    this.autoBattle.queueTargetCleanup(instanceId);
    this.syncUnitVisual(this.enemyVisuals.get(instanceId), enemy);
    if (enemy) {
      this.waveSystem.onEnemyKilled(enemy.enemyId, this.enemies);
    }
  };

  private readonly onWaveCleared = (): void => {
    this.combatActive = false;
    this.formationSystem.cancelWalkIn();
    this.enemyCombat.reset();
    this.autoBattle.clearProjectiles();
    this.waveLabel.setText('WAVE CLEARED');
  };

  private readonly onBattleVictory = (): void => {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.battleLoopActive = false;
    this.gameState.isVictory = true;
    this.combatActive = false;

    if (this.stageId === 'arena') {
      this.scene.start(SCENE_KEYS.ARENA_RESULT, { win: true });
      return;
    }

    const stageData = getStageData(this.stageId);
    const waveCount = stageData?.waves.length ?? WAVES.length;
    const performance = {
      heroesThatDied: this.heroesDeathCount,
      clearTimeMs: this.gameState.elapsedTimeMs,
      wavesCleared: waveCount,
    };
    const rewards = computeStageReward(this.stageId, performance);

    this.scene.start(SCENE_KEYS.VICTORY, {
      stageId: this.stageId,
      rewards,
      performance,
      energyCost: this.energyCost,
    });
  };

  private readonly onWaveEnemiesSpawned = (payload: WaveEnemiesSpawnedPayload): void => {
    this.processedEnemyKills.clear();
    this.enemyCombat.reset();
    this.clearEnemyState();
    this.enemies.push(...payload.enemies);

    for (const enemy of payload.enemies) {
      this.enemyVisuals.set(enemy.instanceId, this.createEnemyVisual(enemy));
    }

    this.waveLabel.setText(`WAVE ${payload.waveNumber}`);

    if (payload.waveIndex === 0) {
      this.formationSystem.animateWalkIn(this.heroes, this.enemies);
      return;
    }

    this.combatActive = false;
    this.autoBattle.clearProjectiles();
    if (payload.waveIndex > 0) {
      this.resetHeroFormationHomes();
    }
    this.formationSystem.snapHeroesToBattlePositions(this.heroes);
    this.formationSystem.animateEnemyWalkIn(this.enemies);
  };

  private readonly onBossHpUpdate = (payload: BossHpPayload): void => {
    this.bossBar.setVisible(payload.visible);
    if (payload.visible) {
      this.bossBar.update(payload.bossHp, payload.bossMaxHp);
    }
  };

  private readonly onGruntSummoned = (grunt: EnemyRuntimeState): void => {
    this.enemyVisuals.set(grunt.instanceId, this.createEnemyVisual(grunt));
  };

  constructor() {
    super({ key: BattleScene.KEY });
  }

  init(data: { stageId?: string; arenaOpponentId?: string; formation?: (string | null)[] }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
    this.arenaOpponentId = data.arenaOpponentId ?? null;
    this.sceneFormation = data.formation ?? null;
    const stageData = getStageData(this.stageId);
    this.energyCost = stageData?.energyCost ?? 0;
  }

  create(): void {
    this.teardownBattleSystems();
    this.resetBattleSession();

    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    this.battleBackground = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.BATTLE_HEIGHT,
      UI.BACKGROUND_COLOR,
    );

    this.waveLabel = this.add.text(UI.WAVE_LABEL_X, UI.WAVE_LABEL_Y, 'WAVE 1', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    if (this.stageId === 'arena') {
      this.add.text(CANVAS.WIDTH / 2, 18, 'Rival formation defeated by Riftborn — hold the line!', {
        fontSize: '10px',
        color: '#888899',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    const realm = loadCurrentRealm();
    const save = (realm ?? buildDefaultRealmV3('battle', 'Player')) as RealmSaveDataV3;
    this.spawnHeroes(save);
    const autoUltimate = realm?.settings.defaultAutoUltimate ?? false;
    this.gameState = createBattleGameState(this.heroes, this.enemies, autoUltimate);

    this.formationSystem = new FormationSystem();
    this.formationSystem.on('formationReady', this.onFormationReady);
    this.formationSystem.on('waveEnemiesReady', this.onWaveEnemiesReady);

    this.bossBar = new BossBar(this);
    this.bossBar.create();

    this.enemyCombat = new EnemyCombatSystem(this);
    this.autoBattle = new AutoBattleSystem(this, this.enemyCombat);
    this.autoBattle.on('enemyKilled', this.onEnemyKilled);

    this.waveSystem = new WaveSystem(this);
    this.waveSystem.on('waveEnemiesSpawned', this.onWaveEnemiesSpawned);
    this.waveSystem.on('waveCleared', this.onWaveCleared);
    this.waveSystem.on('battleVictory', this.onBattleVictory);
    this.waveSystem.on('bossHpUpdate', this.onBossHpUpdate);

    const stageData = getStageData(this.stageId);
    const waveConfigs = this.stageId === 'arena' && this.arenaOpponentId
      ? buildArenaWaveConfig(this.arenaOpponentId)
      : (stageData?.waves
        ?? ((!this.stageId || this.stageId === 'stage_1_1') ? WAVES : []));
    this.waveSystem.init(waveConfigs.length > 0 ? waveConfigs : WAVES);

    this.ultimateSystem = new UltimateSystem(this);
    this.ultimateButtons = new UltimateButtons(
      this,
      this.gameState,
      (heroId) => this.ultimateSystem.fireUltimate(heroId, this.gameState),
      (enabled) => this.handleAutoUltimateToggle(enabled),
    );
    this.ultimateButtons.create(this.buildHudPortraits());
    this.ultimateSystem.on('enemyKilled', this.onEnemyKilled);

    this.syncAllVisuals();
    this.battleLoopActive = true;
  }

  private teardownBattleSystems(): void {
    this.battleLoopActive = false;
    this.processedEnemyKills.clear();

    this.formationSystem?.off('formationReady', this.onFormationReady);
    this.formationSystem?.off('waveEnemiesReady', this.onWaveEnemiesReady);
    this.autoBattle?.off('enemyKilled', this.onEnemyKilled);
    this.ultimateSystem?.off('enemyKilled', this.onEnemyKilled);
    this.waveSystem?.off('waveEnemiesSpawned', this.onWaveEnemiesSpawned);
    this.waveSystem?.off('waveCleared', this.onWaveCleared);
    this.waveSystem?.off('battleVictory', this.onBattleVictory);
    this.waveSystem?.off('bossHpUpdate', this.onBossHpUpdate);

    this.autoBattle?.destroy();
    this.enemyCombat?.destroy();
    this.formationSystem?.destroy();
    this.ultimateSystem?.destroy();
    this.ultimateButtons?.destroy();
    this.waveSystem?.destroy();
    this.bossBar?.destroy();
  }

  private resetHeroFormationHomes(): void {
    for (const hero of this.heroes) {
      const slotIndex = this.combatSlotByHeroId.get(hero.heroId);
      if (slotIndex === undefined) continue;
      const position = getHeroBattlePosition(slotIndex);
      hero.targetX = position.x;
      hero.targetY = position.y;
    }
  }

  private resetBattleSession(): void {
    this.battleEnded = false;
    this.combatActive = false;
    this.heroesDeathCount = 0;
    this.heroes = [];
    this.enemies = [];
    this.heroVisuals.clear();
    this.enemyVisuals.clear();
    this.heroAliveSnapshot.clear();
    this.combatSlotByHeroId.clear();
  }

  update(_time: number, delta: number): void {
    if (!this.battleLoopActive || this.battleEnded) return;

    const deltaSeconds = delta / 1000;
    this.formationSystem.update(deltaSeconds);

    this.waveSystem.update(delta, this.heroes, this.enemies, this.onGruntSummoned);

    const canFight = this.combatActive
      && !this.waveSystem.isInterWavePause
      && !this.formationSystem.isActive;

    if (canFight) {
      this.gameState.elapsedTimeMs += delta;
      const bossState = this.enemyCombat.update(
        delta,
        this.heroes,
        this.enemies,
        this.onGruntSummoned,
      );
      if (bossState) {
        this.bossBar.setVisible(true);
        this.bossBar.update(bossState.bossHp, bossState.bossMaxHp);
      }
      this.autoBattle.update(this.heroes, this.enemies, deltaSeconds, this.gameState.elapsedTimeMs);
      this.ultimateSystem.update(deltaSeconds, this.gameState);
    }

    this.trackHeroDeaths();
    this.checkDefeat();

    this.syncAllVisuals();
    this.ultimateButtons.update(this.heroes);
  }

  private trackHeroDeaths(): void {
    for (const hero of this.heroes) {
      const wasAlive = this.heroAliveSnapshot.get(hero.heroId) ?? true;
      if (wasAlive && !hero.isAlive) {
        this.heroesDeathCount += 1;
        if (!this.gameState.firstHeroToFall) {
          this.gameState.firstHeroToFall = hero.heroId;
        }
      }
      this.heroAliveSnapshot.set(hero.heroId, hero.isAlive);
    }
  }

  private checkDefeat(): void {
    if (this.battleEnded || !this.combatActive) return;

    const livingHeroes = this.heroes.filter((hero) => hero.isAlive);
    if (livingHeroes.length > 0) return;

    this.battleEnded = true;
    this.gameState.isDefeat = true;
    this.combatActive = false;

    const fallenHeroId = this.gameState.firstHeroToFall ?? DEFAULT_LINEUP_HERO_IDS[0];
    const fallenName = getHeroDisplayName(fallenHeroId);

    if (this.stageId === 'arena') {
      this.scene.start(SCENE_KEYS.ARENA_RESULT, { win: false });
      return;
    }

    this.scene.start(SCENE_KEYS.DEFEAT, {
      firstHeroName: fallenName,
      stageId: this.stageId,
      wavesCleared: this.waveSystem.getWavesCleared(),
      energyCost: this.energyCost,
    });
  }

  private handleAutoUltimateToggle(enabled: boolean): void {
    this.gameState.autoUltimate = enabled;
    const realm = loadCurrentRealm();
    if (!realm) return;
    realm.settings.defaultAutoUltimate = enabled;
    saveCurrentRealm(realm);
  }

  private buildHudPortraits(): HudPortraitConfig[] {
    return this.heroes.map((hero) => {
      const setup = buildHeroSetupEntry(hero.heroId);
      return {
        id: hero.heroId,
        name: setup?.name ?? hero.heroId,
        color: setup?.color ?? 0xffffff,
      };
    });
  }

  private spawnHeroes(save: RealmSaveDataV3): void {
    const lineupHeroIds = resolveBattleLineupHeroIds(this.sceneFormation);
    const lineupEntries: HeroLineupEntry[] = lineupHeroIds.flatMap((heroId) => {
      const setup = buildHeroSetupEntry(heroId);
      if (!setup) return [];
      return [{ heroId: setup.id, heroClass: setup.heroClass }];
    });
    const combatSlotByHeroId = assignCombatSlotIndices(lineupEntries);

    for (const heroId of lineupHeroIds) {
      const setup = buildHeroSetupEntry(heroId);
      if (!setup) continue;

      const combatSlotIndex = combatSlotByHeroId.get(heroId) ?? FORMATION.COMBAT_FRONT_SLOT_INDICES[0];
      this.combatSlotByHeroId.set(heroId, combatSlotIndex);
      const position = getHeroBattlePosition(combatSlotIndex);
      const healCooldown = setup.heroClass === 'support' ? setup.attackCooldown : 0;

      const hero: BattleHero = {
        heroId: setup.id,
        heroClass: setup.heroClass,
        x: position.x,
        y: position.y,
        targetX: position.x,
        targetY: position.y,
        radius: setup.radius,
        currentHP: setup.baseHP,
        maxHP: setup.baseHP,
        attack: setup.baseAttack,
        defense: setup.baseDefense,
        attackCooldown: setup.attackCooldown,
        attackRange: setup.attackRange,
        moveSpeed: setup.moveSpeed,
        currentEnergy: 0,
        isAlive: true,
        attackCooldownRemaining: 0,
        healCooldownRemaining: healCooldown,
        ultimateReady: false,
        attackCounter: 0,
        activeBuffs: [],
        activeDebuffs: [],
        runtimeKit: {} as BattleHero['runtimeKit'],
        v2StatusEffects: [],
      };

      SkillSystem.initializeHeroRuntimeKit(hero, save);
      this.heroes.push(hero);
      this.heroAliveSnapshot.set(hero.heroId, true);
      const visual = this.createUnitVisual(setup.name, setup.color, setup.radius, position.x, position.y);
      visual.energyBar = this.add.graphics();
      this.heroVisuals.set(setup.id, visual);
    }
  }

  private createEnemyVisual(enemy: EnemyRuntimeState): UnitVisual {
    const color = getEnemyColor(enemy.enemyId);
    const label = getEnemyDisplayName(enemy.enemyId);
    return this.createUnitVisual(label, color, enemy.radius, enemy.x, enemy.y);
  }

  private clearEnemyState(): void {
    for (const visual of this.enemyVisuals.values()) {
      visual.circle.destroy();
      visual.label.destroy();
      visual.hpBar.destroy();
    }
    this.enemyVisuals.clear();
    this.enemies.length = 0;
  }

  private createUnitVisual(
    name: string,
    color: number,
    radius: number,
    x: number,
    y: number,
  ): UnitVisual {
    const circle = this.add.circle(x, y, radius, color);
    const label = this.add.text(x, y + radius, name, {
      fontSize: `${Math.max(10, Math.min(radius, 14))}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    const hpBar = this.add.graphics();

    return { circle, label, hpBar };
  }

  private syncAllVisuals(): void {
    for (const hero of this.heroes) {
      this.syncHeroVisual(this.heroVisuals.get(hero.heroId), hero);
    }
    for (const enemy of this.enemies) {
      this.syncUnitVisual(this.enemyVisuals.get(enemy.instanceId), enemy);
    }
  }

  private syncHeroVisual(
    visual: UnitVisual | undefined,
    hero: HeroRuntimeState | undefined,
  ): void {
    if (!visual || !hero) return;

    visual.circle.setVisible(hero.isAlive);
    visual.label.setVisible(hero.isAlive);
    visual.hpBar.setVisible(hero.isAlive);
    visual.energyBar?.setVisible(hero.isAlive);

    if (!hero.isAlive) return;

    visual.circle.setPosition(hero.x, hero.y);
    visual.label.setPosition(hero.x, hero.y + hero.radius);
    this.drawHpBar(visual.hpBar, hero);
    if (visual.energyBar) {
      visual.energyBar.clear();
      drawEnergyBar(visual.energyBar, hero);
    }
  }

  private syncUnitVisual(
    visual: UnitVisual | undefined,
    unit: HeroRuntimeState | EnemyRuntimeState | undefined,
  ): void {
    if (!visual || !unit) return;

    visual.circle.setVisible(unit.isAlive);
    visual.label.setVisible(unit.isAlive);
    visual.hpBar.setVisible(unit.isAlive);

    if (!unit.isAlive) return;

    visual.circle.setPosition(unit.x, unit.y);
    visual.label.setPosition(unit.x, unit.y + unit.radius);
    this.drawHpBar(visual.hpBar, unit);
  }

  private drawHpBar(
    graphics: Phaser.GameObjects.Graphics,
    unit: HeroRuntimeState | EnemyRuntimeState,
  ): void {
    const hpRatio = unit.currentHP / unit.maxHP;
    const barColor = hpRatio <= UI.HP_COLOR_THRESHOLD ? UI.HP_COLOR_LOW : UI.HP_COLOR_HIGH;
    const barX = unit.x - UI.HP_BAR_WIDTH / 2;
    const barY = unit.y + UI.HP_BAR_Y_OFFSET;

    graphics.clear();
    graphics.fillStyle(UI.HP_BAR_BG_COLOR, 1);
    graphics.fillRect(barX, barY, UI.HP_BAR_WIDTH, UI.HP_BAR_HEIGHT);
    graphics.fillStyle(barColor, 1);
    graphics.fillRect(barX, barY, UI.HP_BAR_WIDTH * hpRatio, UI.HP_BAR_HEIGHT);
  }

  shutdown(): void {
    this.teardownBattleSystems();

    this.battleBackground?.destroy();
    this.waveLabel?.destroy();

    for (const visual of this.heroVisuals.values()) {
      visual.circle.destroy();
      visual.label.destroy();
      visual.hpBar.destroy();
      visual.energyBar?.destroy();
    }
    for (const visual of this.enemyVisuals.values()) {
      visual.circle.destroy();
      visual.label.destroy();
      visual.hpBar.destroy();
    }

    this.sceneFormation = null;
    this.energyCost = 0;
    this.resetBattleSession();
  }
}
