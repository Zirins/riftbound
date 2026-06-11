// src/scenes/BattleScene.ts
// V0.1: Battlefield rendering + AutoBattleSystem combat loop.

import Phaser from 'phaser';
import { CANVAS, COMBAT, ENEMIES, FORMATION, HEROES, UI, WAVES } from '../constants/gameConfig';
import { AutoBattleSystem } from '../systems/AutoBattleSystem';
import { FormationSystem, getHeroBattlePosition } from '../systems/FormationSystem';
import { WaveSystem } from '../systems/WaveSystem';
import type { EnemyRuntimeState, HeroClass, HeroRuntimeState } from '../types';

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
}

// Indexed by formation slot 0–3. Slot index maps directly to FORMATION.HERO_POSITIONS[slot].
const HEROES_BY_FORMATION_SLOT: HeroSetupEntry[] = [
  {
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
  {
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
  {
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
  {
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
];

const GRUNT_COUNT = WAVES[0].enemies[0].count;

export class BattleScene extends Phaser.Scene {
  static readonly KEY = 'BattleScene';

  private battleBackground!: Phaser.GameObjects.Rectangle;
  private waveLabel!: Phaser.GameObjects.Text;

  private heroes: HeroRuntimeState[] = [];
  private enemies: EnemyRuntimeState[] = [];
  private heroVisuals = new Map<string, UnitVisual>();
  private enemyVisuals = new Map<string, UnitVisual>();

  private autoBattle!: AutoBattleSystem;
  private waveSystem!: WaveSystem;
  private formationSystem!: FormationSystem;
  private combatActive = false;

  private readonly onFormationReady = (): void => {
    this.combatActive = true;
  };

  private readonly onEnemyKilled = (instanceId: string): void => {
    this.syncUnitVisual(this.enemyVisuals.get(instanceId), this.enemies.find((e) => e.instanceId === instanceId));
    this.waveSystem.onEnemyKilled(this.enemies);
  };

  private readonly onWaveCleared = (): void => {
    this.waveLabel.setText('WAVE CLEARED');
  };

  constructor() {
    super({ key: BattleScene.KEY });
  }

  create(): void {
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

    this.spawnHeroes();
    this.spawnGrunts();

    this.formationSystem = new FormationSystem();
    this.formationSystem.animateWalkIn(this.heroes, this.enemies);
    this.formationSystem.on('formationReady', this.onFormationReady);
    this.syncAllVisuals();

    this.autoBattle = new AutoBattleSystem(this);
    this.waveSystem = new WaveSystem();

    this.autoBattle.on('enemyKilled', this.onEnemyKilled);
    this.waveSystem.on('waveCleared', this.onWaveCleared);
  }

  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.formationSystem.update(deltaSeconds);
    this.syncAllVisuals();

    if (!this.combatActive) return;

    this.autoBattle.update(this.heroes, this.enemies, deltaSeconds);
  }

  private spawnHeroes(): void {
    for (let slotIndex = 0; slotIndex < HEROES_BY_FORMATION_SLOT.length; slotIndex += 1) {
      const setup = HEROES_BY_FORMATION_SLOT[slotIndex];
      const position = getHeroBattlePosition(slotIndex);

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
      this.heroVisuals.set(
        setup.id,
        this.createUnitVisual(setup.name, setup.color, setup.radius, position.x, position.y),
      );
    }
  }

  private spawnGrunts(): void {
    for (let slotIndex = 0; slotIndex < GRUNT_COUNT; slotIndex += 1) {
      const position = FORMATION.ENEMY_POSITIONS[slotIndex];
      const instanceId = `${ENEMIES.GRUNT.ID}_${slotIndex}`;
      const enemy: EnemyRuntimeState = {
        enemyId: ENEMIES.GRUNT.ID,
        instanceId,
        x: position.x,
        y: position.y,
        currentHP: ENEMIES.GRUNT.HP,
        maxHP: ENEMIES.GRUNT.HP,
        attack: ENEMIES.GRUNT.ATTACK,
        defense: ENEMIES.GRUNT.DEFENSE,
        moveSpeed: ENEMIES.GRUNT.SPEED,
        attackCooldown: ENEMIES.GRUNT.ATTACK_COOLDOWN,
        attackRange: ENEMIES.GRUNT.ATTACK_RANGE,
        radius: ENEMIES.GRUNT.RADIUS,
        isAlive: true,
        attackCooldownRemaining: 0,
        activeDebuffs: [],
      };

      this.enemies.push(enemy);
      this.enemyVisuals.set(
        instanceId,
        this.createUnitVisual('Grunt', ENEMIES.GRUNT.COLOR, ENEMIES.GRUNT.RADIUS, position.x, position.y),
      );
    }
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
      this.syncUnitVisual(this.heroVisuals.get(hero.heroId), hero);
    }
    for (const enemy of this.enemies) {
      this.syncUnitVisual(this.enemyVisuals.get(enemy.instanceId), enemy);
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
    this.autoBattle?.off('enemyKilled', this.onEnemyKilled);
    this.waveSystem?.off('waveCleared', this.onWaveCleared);
    this.autoBattle?.clearProjectiles();

    this.battleBackground?.destroy();
    this.waveLabel?.destroy();

    for (const visual of this.heroVisuals.values()) {
      visual.circle.destroy();
      visual.label.destroy();
      visual.hpBar.destroy();
    }
    for (const visual of this.enemyVisuals.values()) {
      visual.circle.destroy();
      visual.label.destroy();
      visual.hpBar.destroy();
    }

    this.heroVisuals.clear();
    this.enemyVisuals.clear();
    this.heroes = [];
    this.enemies = [];
  }
}
