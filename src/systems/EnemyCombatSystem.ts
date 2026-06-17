// src/systems/EnemyCombatSystem.ts
// Chapter 2/3 enemy skills, telegraphs, and boss mechanics (Section 19).

import Phaser from 'phaser';
import { BATTLE_STAT_CAPS, CANVAS, FORMATION, HERO_NEW, UI, WARDEN } from '../constants/gameConfig';
import {
  ENEMY_IDS,
  getEnemySpawnTemplate,
} from '../data/enemies';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';
import { enemyRef, ensureBattleHero, heroRef, isUnitAlive, buildBattleState } from './battleStateUtils';
import { SkillSystem } from './SkillSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { getEnemyTarget } from './TargetingSystem';
import { clampEnemyPosition, clampHeroPosition } from './BattlefieldBounds';

const ZY = HERO_NEW.ZHAO_YAN;

interface SkillCooldownState {
  remainingMs: number;
}

interface PendingTelegraph {
  id: string;
  skillId: string;
  remainingMs: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: number;
  alpha: number;
  graphic?: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  onResolve: () => void;
}

interface ActiveSilenceField {
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
  graphic: Phaser.GameObjects.Arc;
}

export class EnemyCombatSystem {
  private readonly skillCooldowns = new Map<string, Map<string, SkillCooldownState>>();
  private readonly pendingTelegraphs: PendingTelegraph[] = [];
  private readonly silenceFields: ActiveSilenceField[] = [];
  private spawnCounter = 0;
  private currentHeroes: HeroRuntimeState[] = [];
  private currentEnemies: EnemyRuntimeState[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  reset(): void {
    this.skillCooldowns.clear();
    this.clearTelegraphs();
    this.clearSilenceFields();
    this.spawnCounter = 0;
  }

  destroy(): void {
    this.reset();
  }

  update(
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): { bossHp: number; bossMaxHp: number } | null {
    this.currentHeroes = heroes;
    this.currentEnemies = enemies;
    this.tickTelegraphs(deltaMs, heroes, enemies);

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      this.tickEnemySkills(enemy, deltaMs, heroes, enemies, onSummon);
    }

    this.tickSilenceFields(deltaMs, heroes);

    const boss = enemies.find((enemy) => enemy.isAlive && enemy.isBoss);
    return boss ? { bossHp: boss.currentHP, bossMaxHp: boss.maxHP } : null;
  }

  shouldDodgeIncomingAttack(attacker: HeroRuntimeState, target: EnemyRuntimeState): boolean {
    if (!target.dodgeChance || target.dodgeChance <= 0) return false;
    const ref = enemyRef(target);
    if (StatusEffectSystem.isStunned(ref) || StatusEffectSystem.isSilenced(ref)) {
      return false;
    }
    if (
      StatusEffectSystem.isStunned(heroRef(ensureBattleHero(attacker)))
      || StatusEffectSystem.isSilenced(heroRef(ensureBattleHero(attacker)))
    ) {
      return false;
    }
    return Math.random() < Math.min(BATTLE_STAT_CAPS.DODGE_CHANCE, target.dodgeChance);
  }

  applyBasicAttackReduction(rawDamage: number, target: EnemyRuntimeState): number {
    if (!target.basicAttackDamageReduction) return rawDamage;
    return Math.round(rawDamage * (1 - target.basicAttackDamageReduction));
  }

  private tickEnemySkills(
    enemy: EnemyRuntimeState,
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): void {
    if (enemy.enemyId === ENEMY_IDS.WARDEN) {
      this.tickLegacyWarden(enemy, deltaMs, heroes, enemies, onSummon);
      return;
    }

    const cooldowns = this.getCooldownMap(enemy.instanceId);
    for (const skillId of this.getSkillIds(enemy.enemyId)) {
      const fullCooldown = this.getSkillCooldown(enemy.enemyId, skillId);
      const state = cooldowns.get(skillId) ?? { remainingMs: fullCooldown };
      state.remainingMs -= deltaMs;
      if (state.remainingMs > 0) {
        cooldowns.set(skillId, state);
        continue;
      }

      if (this.tryCastSkill(enemy, skillId, heroes, enemies, onSummon)) {
        state.remainingMs = this.getSkillCooldown(enemy.enemyId, skillId);
      }
      cooldowns.set(skillId, state);
    }
  }

  private getSkillIds(enemyId: string): string[] {
    switch (enemyId) {
      case ENEMY_IDS.RIFT_PHANTOM:
        return ['phase_cut'];
      case ENEMY_IDS.HOLLOW_SENTINEL:
        return ['hollow_bulwark'];
      case ENEMY_IDS.HOLLOW_WARDEN:
        return ['silence_field', 'warden_pulse'];
      case ENEMY_IDS.IRONREACH_CRUSHER:
        return ['iron_slam'];
      case ENEMY_IDS.IRONREACH_INVOKER_ELITE:
        return ['ember_bolt', 'rift_spark'];
      case ENEMY_IDS.IRONREACH_TITAN:
        return ['titan_quake', 'call_crushers'];
      default:
        return [];
    }
  }

  private getSkillCooldown(enemyId: string, skillId: string): number {
    const cooldowns: Record<string, Record<string, number>> = {
      [ENEMY_IDS.RIFT_PHANTOM]: { phase_cut: 6000 },
      [ENEMY_IDS.HOLLOW_SENTINEL]: { hollow_bulwark: 8000 },
      [ENEMY_IDS.HOLLOW_WARDEN]: { silence_field: 10000, warden_pulse: 7000 },
      [ENEMY_IDS.IRONREACH_CRUSHER]: { iron_slam: 7000 },
      [ENEMY_IDS.IRONREACH_INVOKER_ELITE]: { ember_bolt: 5000, rift_spark: 9000 },
      [ENEMY_IDS.IRONREACH_TITAN]: { titan_quake: 11000, call_crushers: 14000 },
    };
    return cooldowns[enemyId]?.[skillId] ?? 8000;
  }

  private tryCastSkill(
    caster: EnemyRuntimeState,
    skillId: string,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): boolean {
    if (StatusEffectSystem.isStunned(enemyRef(caster))) return false;

    switch (skillId) {
      case 'phase_cut':
        return this.queuePhaseCut(caster, heroes);
      case 'hollow_bulwark':
        return this.castHollowBulwark(caster, enemies);
      case 'silence_field':
        return this.queueSilenceField(caster, heroes);
      case 'warden_pulse':
        return this.castWardenPulse(caster, heroes);
      case 'iron_slam':
        return this.queueIronSlam(caster, heroes);
      case 'ember_bolt':
        return this.castEmberBolt(caster, heroes);
      case 'rift_spark':
        return this.castRiftSpark(caster, heroes);
      case 'titan_quake':
        return this.queueTitanQuake(caster, heroes);
      case 'call_crushers':
        return this.castCallCrushers(caster, enemies, onSummon);
      default:
        return false;
    }
  }

  private tickLegacyWarden(
    warden: EnemyRuntimeState,
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): void {
    const cooldowns = this.getCooldownMap(warden.instanceId);
    const slam = cooldowns.get('rift_slam') ?? { remainingMs: WARDEN.SLAM_INTERVAL * 0.5 };
    const summon = cooldowns.get('summon_adds') ?? { remainingMs: WARDEN.SUMMON_INTERVAL * 0.5 };
    slam.remainingMs -= deltaMs;
    summon.remainingMs -= deltaMs;

    if (slam.remainingMs <= 0) {
      this.queueLegacySlam(heroes);
      slam.remainingMs = WARDEN.SLAM_INTERVAL;
    }
    if (summon.remainingMs <= 0) {
      this.summonLegacyGrunts(warden, onSummon);
      summon.remainingMs = WARDEN.SUMMON_INTERVAL;
    }

    cooldowns.set('rift_slam', slam);
    cooldowns.set('summon_adds', summon);
    void enemies;
  }

  private queueLegacySlam(heroes: HeroRuntimeState[]): void {
    const living = heroes.filter((hero) => hero.isAlive);
    if (living.length === 0) return;
    const target = living.reduce((lowest, hero) =>
      hero.currentHP < lowest.currentHP ? hero : lowest,
    );

    this.pendingTelegraphs.push({
      id: `telegraph_${Date.now()}`,
      skillId: 'rift_slam',
      remainingMs: WARDEN.SLAM_DELAY,
      targetX: target.x,
      targetY: target.y,
      radius: WARDEN.SLAM_RADIUS,
      color: WARDEN.WARN_COLOR,
      alpha: WARDEN.WARN_ALPHA,
      onResolve: () => this.applyCircleDamageToHeroes(
        target.x,
        target.y,
        WARDEN.SLAM_RADIUS,
        WARDEN.SLAM_DAMAGE,
        heroes,
      ),
    });
  }

  private summonLegacyGrunts(
    warden: EnemyRuntimeState,
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): void {
    for (let index = 0; index < WARDEN.SUMMON_COUNT; index += 1) {
      const offsetX = (index - (WARDEN.SUMMON_COUNT - 1) / 2) * FORMATION.ENEMY_SUMMON_SPREAD;
      onSummon(this.createSummonedEnemy(ENEMY_IDS.GRUNT, warden.x + offsetX, warden.y, 1));
    }
  }

  private queuePhaseCut(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const target = getEnemyTarget(caster, heroes);
    if (!target) return false;

    this.pendingTelegraphs.push({
      id: `telegraph_${Date.now()}`,
      skillId: 'phase_cut',
      remainingMs: 400,
      targetX: target.x - 18,
      targetY: target.y,
      radius: 14,
      color: 0x8844cc,
      alpha: 0.45,
      onResolve: () => {
        caster.x = target.x - (caster.radius + target.radius + 4);
        caster.y = target.y;
        const damage = Math.round(caster.attack * 1.4);
        this.applyDamageToHero(target, damage);
        StatusEffectSystem.applyStatus(heroRef(ensureBattleHero(target)), 'wound', {
          durationMs: 4000,
          value: 0.30,
        });
      },
    });
    return true;
  }

  private castHollowBulwark(caster: EnemyRuntimeState, enemies: EnemyRuntimeState[]): boolean {
    const allies = enemies
      .filter((enemy) => enemy.isAlive && enemy.instanceId !== caster.instanceId)
      .sort((a, b) => this.distance(caster, a) - this.distance(caster, b))
      .slice(0, 2);
    const shieldAmount = Math.round(caster.maxHP * 0.15);

    for (const ally of allies) {
      StatusEffectSystem.applyStatus(enemyRef(ally), 'shielded', {
        durationMs: 5000,
        value: shieldAmount,
      });
      const ring = this.scene.add.circle(ally.x, ally.y, ally.radius + 10, 0x6644aa, 0.25);
      ring.setDepth(UI.ULTIMATE_VFX_DEPTH - 1);
      this.scene.time.delayedCall(600, () => ring.destroy());
    }
    return allies.length > 0;
  }

  private queueSilenceField(_caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const target = heroes.find((hero) => hero.isAlive);
    if (!target) return false;
    const radius = 110;

    this.pendingTelegraphs.push({
      id: `telegraph_${Date.now()}`,
      skillId: 'silence_field',
      remainingMs: 1200,
      targetX: target.x,
      targetY: target.y,
      radius,
      color: 0x6622cc,
      alpha: 0.35,
      onResolve: () => {
        const graphic = this.scene.add.circle(target.x, target.y, radius, 0x6622cc, 0.18);
        graphic.setDepth(UI.ULTIMATE_VFX_DEPTH - 2);
        this.silenceFields.push({
          x: target.x,
          y: target.y,
          radius,
          remainingMs: 4000,
          graphic,
        });
      },
    });
    return true;
  }

  private castWardenPulse(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const radius = 120;
    const damage = Math.round(caster.attack * 1.2);
    const ring = this.scene.add.circle(caster.x, caster.y, radius, 0x8844cc, 0.3);
    ring.setDepth(UI.ULTIMATE_VFX_DEPTH - 1);
    this.scene.time.delayedCall(250, () => ring.destroy());
    this.applyCircleDamageToHeroes(caster.x, caster.y, radius, damage, heroes);
    return true;
  }

  private queueIronSlam(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const target = getEnemyTarget(caster, heroes);
    if (!target) return false;
    const coneWidth = 90;
    const coneHeight = 140;

    this.pendingTelegraphs.push({
      id: `telegraph_${Date.now()}`,
      skillId: 'iron_slam',
      remainingMs: 800,
      targetX: target.x - coneWidth / 2,
      targetY: target.y - coneHeight / 2,
      radius: coneWidth,
      color: 0xff8844,
      alpha: 0.35,
      onResolve: () => {
        const damage = Math.round(caster.attack * 1.6);
        for (const hero of heroes) {
          if (!hero.isAlive) continue;
          if (hero.x >= caster.x - 40 && hero.x <= caster.x + coneWidth) {
            this.applyDamageToHero(hero, damage);
            StatusEffectSystem.applyStatus(heroRef(ensureBattleHero(hero)), 'slow', {
              durationMs: 3000,
              value: 0.25,
            });
          }
        }
      },
    });
    return true;
  }

  private castEmberBolt(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const living = heroes.filter((hero) => hero.isAlive);
    if (living.length === 0) return false;
    const target = living.reduce((lowest, hero) =>
      hero.currentHP < lowest.currentHP ? hero : lowest,
    );
    const damage = Math.round(caster.attack * 1.3);
    this.applyDamageToHero(target, damage);
    return true;
  }

  private castRiftSpark(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    const damage = Math.round(caster.attack * 0.8);
    for (const hero of heroes) {
      if (!hero.isAlive) continue;
      this.applyDamageToHero(hero, damage);
      if (Math.random() < 0.30) {
        StatusEffectSystem.applyStatus(heroRef(ensureBattleHero(hero)), 'burn', {
          durationMs: 4000,
          value: 40,
        });
      }
    }
    return true;
  }

  private queueTitanQuake(caster: EnemyRuntimeState, heroes: HeroRuntimeState[]): boolean {
    this.pendingTelegraphs.push({
      id: `telegraph_${Date.now()}`,
      skillId: 'titan_quake',
      remainingMs: 1500,
      targetX: 0,
      targetY: CANVAS.BATTLE_HEIGHT / 2 - 20,
      radius: CANVAS.HERO_ZONE_END,
      color: 0xffaa44,
      alpha: 0.3,
      onResolve: () => {
        const damage = Math.round(caster.attack * 1.8);
        for (const hero of heroes) {
          if (!hero.isAlive) continue;
          this.applyDamageToHero(hero, damage);
          if (!caster.bossTraits?.knockbackImmune) {
            hero.x = Math.max(0, hero.x - 24);
            clampHeroPosition(hero);
          }
        }
      },
    });
    return true;
  }

  private castCallCrushers(
    caster: EnemyRuntimeState,
    enemies: EnemyRuntimeState[],
    onSummon: (enemy: EnemyRuntimeState) => void,
  ): boolean {
    const aliveCrushers = enemies.filter(
      (enemy) => enemy.isAlive && enemy.enemyId === ENEMY_IDS.IRONREACH_CRUSHER,
    ).length;
    if (aliveCrushers >= 2) return false;

    const offsetX = aliveCrushers === 0 ? -40 : 40;
    onSummon(this.createSummonedEnemy(ENEMY_IDS.IRONREACH_CRUSHER, caster.x + offsetX, caster.y, 1.05));
    return true;
  }

  private createSummonedEnemy(
    enemyId: string,
    x: number,
    y: number,
    statScale: number,
  ): EnemyRuntimeState {
    const template = getEnemySpawnTemplate(enemyId);
    if (!template) {
      throw new Error(`Missing spawn template for ${enemyId}`);
    }

    this.spawnCounter += 1;
    const scaledHp = Math.round(template.hp * statScale);
    const scaledAttack = Math.round(template.attack * statScale);
    const scaledDefense = Math.round(template.defense * statScale);

    const summoned: EnemyRuntimeState = {
      enemyId,
      instanceId: `${enemyId}_summon_${this.spawnCounter}`,
      x,
      y,
      currentHP: scaledHp,
      maxHP: scaledHp,
      attack: scaledAttack,
      defense: scaledDefense,
      moveSpeed: template.speed,
      attackCooldown: template.attackCooldown,
      attackRange: template.attackRange,
      radius: template.radius,
      isAlive: true,
      attackCooldownRemaining: 0,
      activeDebuffs: [],
      targetingRule: template.targetingRule,
      dodgeChance: template.dodgeChance,
      basicAttackDamageReduction: template.basicAttackDamageReduction,
      basicAttackMultiplier: template.basicAttackMultiplier,
      isBoss: template.isBoss,
      bossTraits: template.bossTraits,
    };
    clampEnemyPosition(summoned);
    return summoned;
  }

  private tickTelegraphs(
    deltaMs: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): void {
    void enemies;
    for (const telegraph of this.pendingTelegraphs) {
      if (!telegraph.graphic) {
        if (telegraph.skillId === 'iron_slam') {
          telegraph.graphic = this.scene.add.rectangle(
            telegraph.targetX + telegraph.radius / 2,
            telegraph.targetY + 70,
            telegraph.radius,
            140,
            telegraph.color,
            telegraph.alpha,
          ) as unknown as Phaser.GameObjects.Arc;
        } else if (telegraph.skillId === 'titan_quake') {
          const width = CANVAS.HERO_ZONE_END;
          telegraph.graphic = this.scene.add.rectangle(
            width / 2,
            CANVAS.BATTLE_HEIGHT / 2,
            width,
            40,
            telegraph.color,
            telegraph.alpha,
          ) as unknown as Phaser.GameObjects.Arc;
        } else {
          telegraph.graphic = this.scene.add.circle(
            telegraph.targetX,
            telegraph.targetY,
            telegraph.radius,
            telegraph.color,
            telegraph.alpha,
          );
        }
        telegraph.graphic.setDepth(UI.ULTIMATE_VFX_DEPTH - 1);
      }
      telegraph.remainingMs -= deltaMs;
    }

    const ready = this.pendingTelegraphs.filter((entry) => entry.remainingMs <= 0);
    for (const telegraph of ready) {
      telegraph.graphic?.destroy();
      telegraph.onResolve();
    }
    this.pendingTelegraphs.splice(
      0,
      this.pendingTelegraphs.length,
      ...this.pendingTelegraphs.filter((entry) => entry.remainingMs > 0),
    );
    void heroes;
  }

  private tickSilenceFields(deltaMs: number, heroes: HeroRuntimeState[]): void {
    for (const field of this.silenceFields) {
      field.remainingMs -= deltaMs;
      for (const hero of heroes) {
        if (!hero.isAlive) continue;
        if (this.distancePoint(hero.x, hero.y, field.x, field.y) <= field.radius) {
          StatusEffectSystem.applyStatus(heroRef(ensureBattleHero(hero)), 'silence', { durationMs: 500 });
        }
      }
    }

    const expired = this.silenceFields.filter((field) => field.remainingMs <= 0);
    for (const field of expired) {
      field.graphic.destroy();
    }
    this.silenceFields.splice(
      0,
      this.silenceFields.length,
      ...this.silenceFields.filter((field) => field.remainingMs > 0),
    );
  }

  private applyCircleDamageToHeroes(
    x: number,
    y: number,
    radius: number,
    damage: number,
    heroes: HeroRuntimeState[],
  ): void {
    const radiusSq = radius * radius;
    for (const hero of heroes) {
      if (!hero.isAlive) continue;
      const dx = hero.x - x;
      const dy = hero.y - y;
      if (dx * dx + dy * dy > radiusSq) continue;
      this.applyDamageToHero(hero, damage);
    }
  }

  private applyDamageToHero(hero: HeroRuntimeState, rawDamage: number): void {
    const battleHero = ensureBattleHero(hero);
    let damage = rawDamage;

    if (
      hero.heroId === ZY.ID
      && hero.emberCharges >= ZY.EMBER_MAX_CHARGES
      && (battleHero.runtimeKit?.awakeningLevel ?? 0) >= 1
    ) {
      damage = Math.floor(damage * (1 - ZY.COUNTER_STANCE_REDUCTION));
    }

    const beforeHp = hero.currentHP;
    const ref = heroRef(battleHero);
    StatusEffectSystem.applyDamageWithMitigation(ref, damage);
    hero.currentHP = ref.unit.currentHP;
    hero.isAlive = isUnitAlive(ref);
    if (!hero.isAlive) {
      hero.currentHP = 0;
    }

    if (damage > 0 && hero.currentHP < beforeHp) {
      SkillSystem.handleHitTaken(
        battleHero,
        buildBattleState(this.currentHeroes, this.currentEnemies, 0),
      );
    }
  }

  private getCooldownMap(instanceId: string): Map<string, SkillCooldownState> {
    let map = this.skillCooldowns.get(instanceId);
    if (!map) {
      map = new Map();
      this.skillCooldowns.set(instanceId, map);
    }
    return map;
  }

  private clearTelegraphs(): void {
    for (const telegraph of this.pendingTelegraphs) {
      telegraph.graphic?.destroy();
    }
    this.pendingTelegraphs.length = 0;
  }

  private clearSilenceFields(): void {
    for (const field of this.silenceFields) {
      field.graphic.destroy();
    }
    this.silenceFields.length = 0;
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private distancePoint(x: number, y: number, px: number, py: number): number {
    const dx = x - px;
    const dy = y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
