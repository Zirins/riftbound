// src/scenes/BattleScene.ts
// V0.1: Battlefield rendering + AutoBattleSystem combat loop.

import Phaser from 'phaser';
import { CANVAS, COMBAT, ENEMIES, FORMATION, HEROES, UI, WAVES, WARDEN } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { createBattleGameState } from '../store/GameState';
import { AutoBattleSystem } from '../systems/AutoBattleSystem';
import { assignCombatSlotIndices, FormationSystem, getHeroBattlePosition } from '../systems/FormationSystem';
import { computeStageReward } from '../systems/RewardSystem';
import { buildArenaWaveConfig } from '../systems/ArenaMatchSystem';
import { getStageData } from '../systems/StageLoader';
import { getBattleLineupHeroIds } from '../systems/SaveSystem';
import { UltimateSystem } from '../systems/UltimateSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { BossBar } from '../ui/BossBar';
import { drawEnergyBar } from '../ui/EnergyBar';
import { UltimateButtons } from '../ui/UltimateButtons';
import type { EnemyRuntimeState, GameState, HeroClass, HeroLineupEntry, HeroRuntimeState } from '../types';

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

const ENEMY_COLORS: Record<string, number> = {
  [ENEMIES.GRUNT.ID]: ENEMIES.GRUNT.COLOR,
  [ENEMIES.SPECTER.ID]: ENEMIES.SPECTER.COLOR,
  [ENEMIES.IRONCLAD.ID]: ENEMIES.IRONCLAD.COLOR,
  [ENEMIES.INVOKER.ID]: ENEMIES.INVOKER.COLOR,
  [WARDEN.ID]: WARDEN.COLOR,
};

const ENEMY_LABELS: Record<string, string> = {
  [ENEMIES.GRUNT.ID]: 'Grunt',
  [ENEMIES.SPECTER.ID]: 'Specter',
  [ENEMIES.IRONCLAD.ID]: 'Ironclad',
  [ENEMIES.INVOKER.ID]: 'Invoker',
  [WARDEN.ID]: 'Warden',
};

const HERO_SETUP_BY_ID: Record<string, HeroSetupEntry> = {
  [HEROES.KAEL.ID]: {
    id: HEROES.KAEL.ID,
    name: 'Kael',
    heroClass: 'tank',
    color: HEROES.KAEL.COLOR,
    radius: HEROES.KAEL.RADIUS,
    baseHP: HEROES.KAEL.BASE_HP,
    baseAttack: HEROES.KAEL.BASE_ATTACK,
    baseDefense: HEROES.KAEL.BASE_DEFENSE,
    attackCooldown: HEROES.KAEL.ATTACK_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    moveSpeed: HEROES.KAEL.SPEED,
  },
  [HEROES.SURA.ID]: {
    id: HEROES.SURA.ID,
    name: 'Sura',
    heroClass: 'fighter',
    color: HEROES.SURA.COLOR,
    radius: HEROES.SURA.RADIUS,
    baseHP: HEROES.SURA.BASE_HP,
    baseAttack: HEROES.SURA.BASE_ATTACK,
    baseDefense: HEROES.SURA.BASE_DEFENSE,
    attackCooldown: HEROES.SURA.ATTACK_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    moveSpeed: HEROES.SURA.SPEED,
  },
  [HEROES.MIRA.ID]: {
    id: HEROES.MIRA.ID,
    name: 'Mira',
    heroClass: 'support',
    color: HEROES.MIRA.COLOR,
    radius: HEROES.MIRA.RADIUS,
    baseHP: HEROES.MIRA.BASE_HP,
    baseAttack: HEROES.MIRA.BASE_ATTACK,
    baseDefense: HEROES.MIRA.BASE_DEFENSE,
    attackCooldown: HEROES.MIRA.HEAL_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    moveSpeed: HEROES.MIRA.SPEED,
  },
  [HEROES.NYRA.ID]: {
    id: HEROES.NYRA.ID,
    name: 'Nyra',
    heroClass: 'ranger',
    color: HEROES.NYRA.COLOR,
    radius: HEROES.NYRA.RADIUS,
    baseHP: HEROES.NYRA.BASE_HP,
    baseAttack: HEROES.NYRA.BASE_ATTACK,
    baseDefense: HEROES.NYRA.BASE_DEFENSE,
    attackCooldown: HEROES.NYRA.ATTACK_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    moveSpeed: HEROES.NYRA.SPEED,
  },
};

export class BattleScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.BATTLE;

  private stageId = 'stage_1_1';
  private arenaOpponentId: string | null = null;
  private energyCost = 0;
  private heroesDeathCount = 0;

  private battleBackground!: Phaser.GameObjects.Rectangle;
  private waveLabel!: Phaser.GameObjects.Text;

  private heroes: HeroRuntimeState[] = [];
  private enemies: EnemyRuntimeState[] = [];
  private heroVisuals = new Map<string, UnitVisual>();
  private enemyVisuals = new Map<string, UnitVisual>();

  private gameState!: GameState;
  private autoBattle!: AutoBattleSystem;
  private waveSystem!: WaveSystem;
  private formationSystem!: FormationSystem;
  private ultimateSystem!: UltimateSystem;
  private ultimateButtons!: UltimateButtons;
  private bossBar!: BossBar;
  private combatActive = false;
  private isFirstWaveSpawn = true;
  private battleEnded = false;
  private readonly heroAliveSnapshot = new Map<string, boolean>();

  private readonly onFormationReady = (): void => {
    this.combatActive = true;
  };

  private readonly onWaveEnemiesReady = (): void => {
    this.combatActive = true;
  };

  private readonly onEnemyKilled = (instanceId: string): void => {
    const enemy = this.enemies.find((unit) => unit.instanceId === instanceId);
    this.autoBattle.queueTargetCleanup(instanceId);
    this.syncUnitVisual(this.enemyVisuals.get(instanceId), enemy);
    if (enemy) {
      this.waveSystem.onEnemyKilled(enemy.enemyId, this.enemies);
    }
  };

  private readonly onWaveCleared = (): void => {
    this.waveLabel.setText('WAVE CLEARED');
  };

  private readonly onBattleVictory = (): void => {
    if (this.battleEnded) return;
    this.battleEnded = true;
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
    this.clearEnemyState();
    this.enemies.push(...payload.enemies);

    for (const enemy of payload.enemies) {
      this.enemyVisuals.set(enemy.instanceId, this.createEnemyVisual(enemy));
    }

    this.waveLabel.setText(`WAVE ${payload.waveNumber}`);

    if (this.isFirstWaveSpawn) {
      this.isFirstWaveSpawn = false;
      this.formationSystem.animateWalkIn(this.heroes, this.enemies);
      return;
    }

    this.combatActive = false;
    this.autoBattle.clearProjectiles();
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

  init(data: { stageId?: string; arenaOpponentId?: string }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
    this.arenaOpponentId = data.arenaOpponentId ?? null;
    const stageData = getStageData(this.stageId);
    this.energyCost = stageData?.energyCost ?? 0;
  }

  create(): void {
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

    this.spawnHeroes();
    this.gameState = createBattleGameState(this.heroes, this.enemies);

    this.formationSystem = new FormationSystem();
    this.formationSystem.on('formationReady', this.onFormationReady);
    this.formationSystem.on('waveEnemiesReady', this.onWaveEnemiesReady);

    this.bossBar = new BossBar(this);
    this.bossBar.create();

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
    );
    this.ultimateButtons.create();

    this.autoBattle = new AutoBattleSystem(this);
    this.autoBattle.on('enemyKilled', this.onEnemyKilled);
    this.ultimateSystem.on('enemyKilled', this.onEnemyKilled);

    this.syncAllVisuals();
  }

  private resetBattleSession(): void {
    this.battleEnded = false;
    this.combatActive = false;
    this.isFirstWaveSpawn = true;
    this.heroesDeathCount = 0;
    this.heroes = [];
    this.enemies = [];
    this.heroVisuals.clear();
    this.enemyVisuals.clear();
    this.heroAliveSnapshot.clear();
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.formationSystem.update(deltaSeconds);

    this.waveSystem.update(delta, this.heroes, this.enemies, this.onGruntSummoned);

    const canFight = this.combatActive
      && !this.waveSystem.isInterWavePause
      && !this.formationSystem.isActive;

    if (canFight) {
      this.gameState.elapsedTimeMs += delta;
      this.autoBattle.update(this.heroes, this.enemies, deltaSeconds);
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

    const fallenHeroId = this.gameState.firstHeroToFall ?? HEROES.KAEL.ID;
    const fallenName = HERO_SETUP_BY_ID[fallenHeroId]?.name ?? 'Unknown';

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

  private spawnHeroes(): void {
    const lineupHeroIds = getBattleLineupHeroIds();
    const lineupEntries: HeroLineupEntry[] = lineupHeroIds.flatMap((heroId) => {
      const setup = HERO_SETUP_BY_ID[heroId];
      if (!setup) return [];
      return [{ heroId: setup.id, heroClass: setup.heroClass }];
    });
    const combatSlotByHeroId = assignCombatSlotIndices(lineupEntries);

    for (const heroId of lineupHeroIds) {
      const setup = HERO_SETUP_BY_ID[heroId];
      if (!setup) continue;

      const combatSlotIndex = combatSlotByHeroId.get(heroId) ?? FORMATION.COMBAT_FRONT_SLOT_INDICES[0];
      const position = getHeroBattlePosition(combatSlotIndex);

      const hero: HeroRuntimeState = {
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
        healCooldownRemaining: HEROES.MIRA.HEAL_COOLDOWN,
        ultimateReady: false,
        attackCounter: 0,
        activeBuffs: [],
        activeDebuffs: [],
      };

      this.heroes.push(hero);
      this.heroAliveSnapshot.set(hero.heroId, true);
      const visual = this.createUnitVisual(setup.name, setup.color, setup.radius, position.x, position.y);
      visual.energyBar = this.add.graphics();
      this.heroVisuals.set(setup.id, visual);
    }
  }

  private createEnemyVisual(enemy: EnemyRuntimeState): UnitVisual {
    const color = ENEMY_COLORS[enemy.enemyId] ?? ENEMIES.GRUNT.COLOR;
    const label = ENEMY_LABELS[enemy.enemyId] ?? 'Enemy';
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
      fontSize: `${radius}px`,
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
    this.formationSystem?.off('formationReady', this.onFormationReady);
    this.formationSystem?.off('waveEnemiesReady', this.onWaveEnemiesReady);
    this.autoBattle?.off('enemyKilled', this.onEnemyKilled);
    this.ultimateSystem?.off('enemyKilled', this.onEnemyKilled);
    this.waveSystem?.off('waveEnemiesSpawned', this.onWaveEnemiesSpawned);
    this.waveSystem?.off('waveCleared', this.onWaveCleared);
    this.waveSystem?.off('battleVictory', this.onBattleVictory);
    this.waveSystem?.off('bossHpUpdate', this.onBossHpUpdate);
    this.autoBattle?.clearProjectiles();
    this.ultimateSystem?.destroy();
    this.ultimateButtons?.destroy();
    this.waveSystem?.destroy();
    this.bossBar?.destroy();

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

    this.resetBattleSession();
  }
}
