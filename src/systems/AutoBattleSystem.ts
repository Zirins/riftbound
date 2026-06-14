// src/systems/AutoBattleSystem.ts
// Core combat loop — attack timers, damage resolution, death detection.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HERO_NEW, HEROES, RANGER } from '../constants/gameConfig';
import { createHeroProjectile, Projectile } from '../entities/Projectile';
import {
  findLowestHpLivingEnemy,
  getEnemyTarget,
  getHeroTarget,
  getNearestLivingEnemy,
  getSupportHealTarget,
} from './TargetingSystem';
import {
  buildBattleState,
  emitNewlyDeadEnemies,
  ensureBattleEnemy,
  ensureBattleHero,
  enemyRef,
  heroRef,
  snapshotDeadEnemyIds,
} from './battleStateUtils';
import { SideSkillVfxSystem } from './SideSkillVfxSystem';
import { SkillSystem } from './SkillSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import type { EnemyCombatSystem } from './EnemyCombatSystem';
import type { BattleHero, EnemyRuntimeState, HeroClass, HeroRuntimeState, SkillCastResult } from '../types';

const R = HERO_NEW.REN;
const SO = HERO_NEW.SOLENNE;
const V = HERO_NEW.VEYRA;
const T = HERO_NEW.THANE;
const C = HERO_NEW.CAIRA;
const MK = HERO_NEW.MAREK;

const REN_MARK_PREFIX = `mark_${R.ID}_`;
const VEYRA_GLARE_DURATION = 3000;

type CombatUnit = HeroRuntimeState | EnemyRuntimeState;

interface DamageOptions {
  skipCounter?: boolean;
  skipFollowUp?: boolean;
  isBasicAttack?: boolean;
}

export class AutoBattleSystem extends Phaser.Events.EventEmitter {
  private readonly projectiles: Projectile[] = [];
  private readonly pendingTargetCleanups = new Set<string>();
  private readonly thaneRootguardDecayMs = new Map<string, number>();
  private readonly marekSquallIdleMs = new Map<string, number>();
  private readonly sideSkillVfx: SideSkillVfxSystem;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyCombat?: EnemyCombatSystem,
  ) {
    super();
    this.sideSkillVfx = new SideSkillVfxSystem(scene);
  }

  update(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
    elapsedTimeMs = 0,
  ): void {
    const deltaMs = delta * 1000;
    const battleState = buildBattleState(heroes, enemies, elapsedTimeMs);
    const deadBeforeSkills = snapshotDeadEnemyIds(enemies);

    for (const hero of battleState.heroes) {
      if (!hero.isAlive || !hero.runtimeKit) continue;
      const castResults = SkillSystem.updateCooldownSkills(hero, battleState, deltaMs);
      this.handleSideSkillCasts(hero, castResults, heroes, enemies);
    }

    StatusEffectSystem.update(deltaMs, battleState);
    emitNewlyDeadEnemies(this, deadBeforeSkills, enemies);

    this.tickStatusEffects(heroes, enemies, delta);
    this.tickProjectiles(heroes, enemies, delta);
    this.tickHeroes(heroes, enemies, delta);
    this.tickEnemies(heroes, enemies, delta);
    this.syncUltimateReady(heroes);
    this.flushProjectileCleanups();
  }

  queueTargetCleanup(instanceId: string): void {
    this.pendingTargetCleanups.add(instanceId);
  }

  clearProjectiles(): void {
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles.length = 0;
    this.pendingTargetCleanups.clear();
  }

  destroy(): void {
    this.clearProjectiles();
    this.sideSkillVfx.destroy();
    this.removeAllListeners();
  }

  private handleSideSkillCasts(
    hero: BattleHero,
    results: SkillCastResult[],
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): void {
    for (const result of results) {
      if (!result.success) continue;
      this.sideSkillVfx.playCastFeedback(hero, result, (unitId, side) => {
        if (side === 'hero') {
          const target = heroes.find((unit) => unit.heroId === unitId);
          return target ? { x: target.x, y: target.y } : null;
        }
        const target = enemies.find((unit) => unit.instanceId === unitId);
        return target ? { x: target.x, y: target.y } : null;
      });
    }
  }

  private tickProjectiles(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i += 1) {
      const projectile = this.projectiles[i];
      const hitTarget = projectile.update(delta, heroes, enemies);

      if (hitTarget && 'instanceId' in hitTarget) {
        const owner = heroes.find((hero) => hero.heroId === projectile.ownerId);
        if (owner) {
          const damage = this.calculateHeroDamage(owner, hitTarget.defense);
          this.applyDamageToEnemy(hitTarget, damage, owner, enemies, { isBasicAttack: true });
        }
        projectile.destroy();
        indicesToRemove.push(i);
        continue;
      }

      if (!projectile.active) {
        indicesToRemove.push(i);
      }
    }

    for (let i = indicesToRemove.length - 1; i >= 0; i -= 1) {
      this.projectiles.splice(indicesToRemove[i], 1);
    }
  }

  private syncUltimateReady(heroes: HeroRuntimeState[]): void {
    for (const hero of heroes) {
      hero.ultimateReady = hero.isAlive && hero.currentEnergy >= COMBAT.ENERGY_MAX;
    }
  }

  private tickStatusEffects(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    const deltaMs = delta * 1000;

    for (const hero of heroes) {
      hero.activeBuffs = hero.activeBuffs.filter((buff) => {
        if (buff.id === 'rootguard' || buff.id === 'gathering_squall') return buff.value > 0;
        buff.durationRemaining -= deltaMs;
        return buff.durationRemaining > 0 && buff.value > 0;
      });
      hero.activeDebuffs = hero.activeDebuffs.filter((debuff) => {
        debuff.durationRemaining -= deltaMs;
        return debuff.durationRemaining > 0;
      });

      if (hero.heroId === MK.ID && hero.isAlive) {
        const squall = hero.activeBuffs.find((buff) => buff.id === 'gathering_squall');
        if (squall) {
          let idleMs = this.marekSquallIdleMs.get(hero.heroId) ?? 0;
          idleMs += deltaMs;
          if (idleMs >= MK.SQUALL_RESET_TIME) {
            hero.activeBuffs = hero.activeBuffs.filter((buff) => buff.id !== 'gathering_squall');
            this.marekSquallIdleMs.delete(hero.heroId);
          } else {
            this.marekSquallIdleMs.set(hero.heroId, idleMs);
          }
        }
      }

      if (hero.heroId === T.ID && hero.isAlive) {
        const rootguard = hero.activeBuffs.find((buff) => buff.id === 'rootguard');
        if (rootguard && rootguard.value > 0) {
          let decayMs = this.thaneRootguardDecayMs.get(hero.heroId) ?? 0;
          decayMs += deltaMs;
          while (decayMs >= 1000 && rootguard.value > 0) {
            rootguard.value -= T.ROOTGUARD_DECAY_RATE;
            decayMs -= 1000;
          }
          if (rootguard.value <= 0) {
            hero.activeBuffs = hero.activeBuffs.filter((buff) => buff.id !== 'rootguard');
          }
          this.thaneRootguardDecayMs.set(hero.heroId, decayMs);
        }
      }
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      for (const debuff of enemy.activeDebuffs) {
        if (debuff.type !== 'burn') continue;
        enemy.currentHP -= debuff.value * delta;
        if (enemy.currentHP <= 0) {
          enemy.currentHP = 0;
          enemy.isAlive = false;
          this.pendingTargetCleanups.add(enemy.instanceId);
          this.emit('enemyKilled', enemy.instanceId);
        }
      }

      enemy.activeDebuffs = enemy.activeDebuffs.filter((debuff) => {
        debuff.durationRemaining -= deltaMs;
        return debuff.durationRemaining > 0;
      });
    }
  }

  private tickHeroes(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    for (const hero of heroes) {
      if (!hero.isAlive) continue;

      const battleHero = ensureBattleHero(hero);
      if (battleHero.runtimeKit && StatusEffectSystem.isStunned(heroRef(battleHero))) {
        continue;
      }

      if (hero.heroClass === 'support') {
        this.tickSupportHero(hero, heroes, enemies, delta);
        continue;
      }

      if (hero.heroClass === 'tank') {
        this.applyTankAdvance(hero, enemies, delta);
      }

      if (hero.heroClass === 'ranger') {
        this.applyRangerStandoff(hero, enemies, delta);
      }

      hero.attackCooldownRemaining -= delta * 1000;
      if (hero.attackCooldownRemaining > 0) continue;

      const target = getHeroTarget(hero, enemies);
      if (!target) continue;

      if (hero.heroClass === 'assassin') {
        this.tickAssassinAttack(hero, target, enemies);
        continue;
      }

      if (hero.heroClass === 'mage') {
        const damage = this.calculateHeroDamage(hero, target.defense);
        this.projectiles.push(
          createHeroProjectile(this.scene, hero, target, damage, this.getHeroColor(hero.heroId)),
        );
        hero.attackCooldownRemaining = hero.attackCooldown;
        continue;
      }

      if (this.isRangedHero(hero.heroClass)) {
        const damage = this.calculateHeroDamage(hero, target.defense);
        this.projectiles.push(
          createHeroProjectile(this.scene, hero, target, damage, this.getHeroColor(hero.heroId)),
        );
        hero.attackCooldownRemaining = hero.attackCooldown;
        continue;
      }

      if (this.getDistance(hero, target) <= hero.attackRange) {
        const damage = this.calculateHeroDamage(hero, target.defense);
        this.applyDamageToEnemy(target, damage, hero, enemies, { isBasicAttack: true });
        hero.attackCooldownRemaining = hero.attackCooldown;
      }
    }
  }

  private tickEnemies(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const battleEnemy = ensureBattleEnemy(enemy);
      if (StatusEffectSystem.isStunned(enemyRef(battleEnemy))) continue;

      enemy.attackCooldownRemaining -= delta * 1000;

      const target = getEnemyTarget(enemy, heroes);
      if (!target) continue;

      const dist = this.getDistance(enemy, target);
      if (dist > enemy.attackRange) {
        this.advanceEnemyTowardTarget(enemy, target, delta);
        continue;
      }

      if (enemy.attackCooldownRemaining > 0) continue;

      const damage = this.calculateDamage(
        this.getEffectiveEnemyAttack(enemy) * (enemy.basicAttackMultiplier ?? 1),
        this.getEffectiveHeroDefense(target),
      );
      this.applyDamageToHero(target, damage, enemy);
      const stagger = this.getDebuffStrength(enemy, 'stagger');
      enemy.attackCooldownRemaining = enemy.attackCooldown * (1 + stagger);
    }
  }

  private advanceEnemyTowardTarget(
    enemy: EnemyRuntimeState,
    target: HeroRuntimeState,
    delta: number,
  ): void {
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const slow = this.getV2SlowMultiplier(enemy);
    const step = enemy.moveSpeed * slow * delta;
    const stopDistance = enemy.radius + target.radius;

    if (dist <= stopDistance + step) {
      enemy.x = target.x - (dx / dist) * stopDistance;
      enemy.y = target.y - (dy / dist) * stopDistance;
      return;
    }

    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
  }

  private getV2SlowMultiplier(unit: EnemyRuntimeState): number {
    const battleEnemy = ensureBattleEnemy(unit);
    const slowStrength = battleEnemy.v2StatusEffects
      .filter((effect) => effect.statusId === 'slow' && effect.durationRemainingMs > 0)
      .reduce((total, effect) => total + effect.value * effect.stacks, 0);
    return Math.max(0.2, 1 - slowStrength);
  }

  private tickSupportHero(
    hero: HeroRuntimeState,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    if (hero.heroId === HEROES.MIRA.ID) {
      this.tickMiraHeal(hero, heroes, delta);
      return;
    }
    if (hero.heroId === V.ID) {
      this.tickVeyraGlare(hero, enemies, delta);
      return;
    }
    if (hero.heroId === C.ID) {
      this.tickCairaDawnMercy(hero, heroes, delta);
    }
  }

  private tickMiraHeal(
    hero: HeroRuntimeState,
    heroes: HeroRuntimeState[],
    delta: number,
  ): void {
    hero.healCooldownRemaining -= delta * 1000;
    if (hero.healCooldownRemaining > 0) return;

    const ally = getSupportHealTarget(hero, heroes);
    if (!ally) {
      hero.currentEnergy = Math.min(
        COMBAT.ENERGY_MAX,
        hero.currentEnergy + HEROES.MIRA.PASSIVE_ENERGY_GAIN,
      );
      hero.healCooldownRemaining = HEROES.MIRA.HEAL_COOLDOWN;
      return;
    }

    ally.currentHP = Math.min(ally.maxHP, ally.currentHP + HEROES.MIRA.PASSIVE_HEAL);
    hero.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      hero.currentEnergy + HEROES.MIRA.ENERGY_GAIN_ON_HEAL,
    );
    hero.healCooldownRemaining = HEROES.MIRA.HEAL_COOLDOWN;
  }

  private tickVeyraGlare(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    hero.healCooldownRemaining -= delta * 1000;
    if (hero.healCooldownRemaining > 0) return;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      enemy.activeDebuffs.push({
        id: `glare_${enemy.instanceId}_${Date.now()}`,
        type: 'attackReduce',
        value: V.ATTACK_REDUCE_PCT,
        durationRemaining: VEYRA_GLARE_DURATION,
      });
    }

    hero.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      hero.currentEnergy + V.ENERGY_GAIN_ON_ABILITY,
    );
    hero.healCooldownRemaining = V.GLARE_INTERVAL;
  }

  private tickCairaDawnMercy(
    hero: HeroRuntimeState,
    heroes: HeroRuntimeState[],
    delta: number,
  ): void {
    hero.healCooldownRemaining -= delta * 1000;
    if (hero.healCooldownRemaining > 0) return;

    const living = heroes.filter((ally) => ally.isAlive);
    if (living.length === 0) {
      hero.healCooldownRemaining = C.HEAL_COOLDOWN;
      return;
    }

    const ally = living.reduce((lowest, candidate) =>
      (candidate.currentHP / candidate.maxHP) < (lowest.currentHP / lowest.maxHP)
        ? candidate
        : lowest,
    );

    const hpRatio = ally.currentHP / ally.maxHP;
    const healAmount = hpRatio < C.LOW_HP_THRESHOLD
      ? Math.floor(C.PASSIVE_HEAL * C.LOW_HP_HEAL_MULT)
      : C.PASSIVE_HEAL;

    ally.currentHP = Math.min(ally.maxHP, ally.currentHP + healAmount);
    hero.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      hero.currentEnergy + C.ENERGY_GAIN_ON_HEAL,
    );
    hero.healCooldownRemaining = C.HEAL_COOLDOWN;
  }

  private applyTankAdvance(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    const target = getNearestLivingEnemy(hero, enemies);
    if (!target) return;

    const dist = this.getDistance(hero, target);
    if (dist <= hero.attackRange) return;

    const dx = target.x - hero.x;
    const dy = target.y - hero.y;
    if (dist === 0) return;

    const speedMult = this.getSlowMultiplier(hero);
    const step = hero.moveSpeed * speedMult * delta;
    const nextX = hero.x + (dx / dist) * step;
    const nextY = hero.y + (dy / dist) * step;

    const engageDist = hero.radius + target.radius;
    const engageX = target.x - (dx / dist) * engageDist;
    const engageY = target.y - (dy / dist) * engageDist;

    hero.x = dx > 0
      ? Math.max(hero.radius, Math.min(engageX, nextX))
      : Math.min(CANVAS.WIDTH - hero.radius, Math.max(engageX, nextX));
    hero.y = dy > 0
      ? Math.min(engageY, nextY)
      : Math.max(engageY, nextY);
    hero.targetX = hero.x;
    hero.targetY = hero.y;
  }

  private applyRangerStandoff(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    const nearest = getNearestLivingEnemy(hero, enemies);
    if (!nearest) return;

    const dist = this.getDistance(hero, nearest);
    if (dist >= RANGER.STANDOFF_RANGE) return;

    const dx = hero.x - nearest.x;
    const dy = hero.y - nearest.y;
    if (dist === 0) return;

    const speedMult = this.getSlowMultiplier(hero);
    const step = hero.moveSpeed * speedMult * delta;
    const nextX = hero.x + (dx / dist) * step;
    const nextY = hero.y + (dy / dist) * step;

    hero.x = Math.max(0, Math.min(CANVAS.HERO_ZONE_END - hero.radius, nextX));
    hero.y = nextY;
    hero.targetX = hero.x;
    hero.targetY = hero.y;
  }

  private applyDamageToEnemy(
    enemy: EnemyRuntimeState,
    damage: number,
    attacker: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
    options: DamageOptions = {},
  ): void {
    if (!enemy.isAlive) return;

    if (options.isBasicAttack && this.enemyCombat?.shouldDodgeIncomingAttack(attacker, enemy)) {
      return;
    }

    let finalDamage = damage;
    if (options.isBasicAttack && enemy.basicAttackDamageReduction) {
      finalDamage = this.enemyCombat?.applyBasicAttackReduction(finalDamage, enemy) ?? finalDamage;
    }
    if (attacker.heroId === R.ID) {
      const isMarked = enemy.activeDebuffs.some(
        (debuff) => debuff.type === 'mark' && debuff.id.startsWith(REN_MARK_PREFIX),
      );
      if (isMarked) {
        finalDamage = Math.max(COMBAT.MIN_DAMAGE, Math.floor(damage * (1 + R.MARK_DAMAGE_BONUS)));
      }
    }

    enemy.currentHP -= finalDamage;
    attacker.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      attacker.currentEnergy + COMBAT.ENERGY_GAIN_ON_HIT,
    );

    if (!options.skipCounter) {
      attacker.attackCounter += 1;
    }

    if (enemy.currentHP <= 0) {
      enemy.currentHP = 0;
      enemy.isAlive = false;
      this.pendingTargetCleanups.add(enemy.instanceId);
      this.emit('enemyKilled', enemy.instanceId);
      return;
    }

    if (options.skipFollowUp) return;

    if (attacker.heroId === MK.ID) {
      this.marekSquallIdleMs.set(attacker.heroId, 0);
      const squall = attacker.activeBuffs.find((buff) => buff.id === 'gathering_squall');
      if (squall) {
        squall.value = Math.min(MK.SQUALL_MAX_STACKS * MK.SQUALL_STACK, squall.value + MK.SQUALL_STACK);
      } else {
        attacker.activeBuffs.push({
          id: 'gathering_squall',
          type: 'attackBuff',
          value: MK.SQUALL_STACK,
          durationRemaining: Number.MAX_SAFE_INTEGER,
        });
      }
    }

    if (attacker.heroId === SO.ID) {
      this.applySolenneSplash(attacker, enemy, enemies, finalDamage);
    }
  }

  private tickAssassinAttack(
    hero: HeroRuntimeState,
    target: EnemyRuntimeState,
    enemies: EnemyRuntimeState[],
  ): void {
    const procInterval = hero.heroId === R.ID ? R.MARK_HIT_COUNT : 4;
    const isDashProc = hero.heroId === R.ID
      && hero.attackCounter % procInterval === procInterval - 1;

    if (isDashProc) {
      this.executeAssassinDashStrike(hero, target, enemies);
      return;
    }

    const damage = this.calculateHeroDamage(hero, target.defense);
    this.projectiles.push(
      createHeroProjectile(this.scene, hero, target, damage, this.getHeroColor(hero.heroId)),
    );
    hero.attackCooldownRemaining = hero.attackCooldown;
  }

  private executeAssassinDashStrike(
    hero: HeroRuntimeState,
    target: EnemyRuntimeState,
    enemies: EnemyRuntimeState[],
  ): void {
    const homeX = hero.targetX;
    const homeY = hero.targetY;
    const engageDist = hero.radius + target.radius + 4;

    hero.x = Math.max(hero.radius, target.x - engageDist);
    hero.y = target.y;

    const damage = this.calculateHeroDamage(hero, target.defense);
    this.applyDamageToEnemy(target, damage, hero, enemies, { skipFollowUp: true });
    this.applyRenMark(hero, enemies);

    hero.x = homeX;
    hero.y = homeY;
    hero.attackCooldownRemaining = hero.attackCooldown;
  }

  private applyRenMark(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
  ): void {
    const target = findLowestHpLivingEnemy(hero, enemies);
    if (!target) return;

    for (const enemy of enemies) {
      enemy.activeDebuffs = enemy.activeDebuffs.filter(
        (debuff) => !(debuff.type === 'mark' && debuff.id.startsWith(REN_MARK_PREFIX)),
      );
    }

    target.activeDebuffs.push({
      id: `${REN_MARK_PREFIX}${target.instanceId}`,
      type: 'mark',
      value: R.MARK_DAMAGE_BONUS,
      durationRemaining: R.MARK_DURATION,
    });
  }

  private applySolenneSplash(
    attacker: HeroRuntimeState,
    primary: EnemyRuntimeState,
    enemies: EnemyRuntimeState[],
    primaryDamage: number,
  ): void {
    const splashDamage = Math.max(
      COMBAT.MIN_DAMAGE,
      Math.floor(primaryDamage * SO.SPLASH_DAMAGE_MULT),
    );
    const radiusSq = SO.SPLASH_RADIUS * SO.SPLASH_RADIUS;

    for (const enemy of enemies) {
      if (!enemy.isAlive || enemy.instanceId === primary.instanceId) continue;
      const dx = primary.x - enemy.x;
      const dy = primary.y - enemy.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      this.applyDamageToEnemy(enemy, splashDamage, attacker, enemies, {
        skipCounter: true,
        skipFollowUp: true,
      });
    }
  }

  private flushProjectileCleanups(): void {
    if (this.pendingTargetCleanups.size === 0) return;

    for (const instanceId of this.pendingTargetCleanups) {
      this.removeProjectilesTargeting(instanceId);
    }
    this.pendingTargetCleanups.clear();
  }

  private removeProjectilesTargeting(instanceId: string): number {
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i += 1) {
      if (this.projectiles[i].targetId === instanceId) {
        this.projectiles[i].destroy();
        indicesToRemove.push(i);
      }
    }

    for (let i = indicesToRemove.length - 1; i >= 0; i -= 1) {
      this.projectiles.splice(indicesToRemove[i], 1);
    }

    return indicesToRemove.length;
  }

  private applyDamageToHero(
    hero: HeroRuntimeState,
    damage: number,
    attacker?: EnemyRuntimeState,
  ): void {
    if (!hero.isAlive) return;

    let remaining = damage;
    const shieldBuff = hero.activeBuffs.find((buff) => buff.type === 'shield');
    if (shieldBuff) {
      const absorbed = Math.min(shieldBuff.value, remaining);
      shieldBuff.value -= absorbed;
      remaining -= absorbed;
      if (shieldBuff.value <= 0) {
        hero.activeBuffs = hero.activeBuffs.filter((buff) => buff.id !== shieldBuff.id);
      }
    }

    hero.currentHP -= remaining;
    hero.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      hero.currentEnergy + COMBAT.ENERGY_GAIN_ON_TAKEN,
    );

    if (hero.heroId === T.ID) {
      this.thaneRootguardDecayMs.set(hero.heroId, 0);
      const rootguard = hero.activeBuffs.find((buff) => buff.id === 'rootguard');
      if (rootguard) {
        rootguard.value = Math.min(T.ROOTGUARD_MAX_STACKS, rootguard.value + 1);
      } else {
        hero.activeBuffs.push({
          id: 'rootguard',
          type: 'defenseBuff',
          value: 1,
          durationRemaining: Number.MAX_SAFE_INTEGER,
        });
      }
    }

    if (hero.currentHP <= 0) {
      hero.currentHP = 0;
      hero.isAlive = false;
      this.emit('heroKilled', hero.heroId);
    }

    void attacker;
  }

  private calculateHeroDamage(attacker: HeroRuntimeState, targetDefense: number): number {
    let attack = attacker.attack;
    if (attacker.heroId === MK.ID) {
      const squall = attacker.activeBuffs.find((buff) => buff.id === 'gathering_squall');
      if (squall) attack += squall.value;
    }
    return this.calculateDamage(attack, targetDefense);
  }

  private calculateDamage(attack: number, defense: number): number {
    return Math.max(COMBAT.MIN_DAMAGE, attack - defense);
  }

  private getEffectiveHeroDefense(hero: HeroRuntimeState): number {
    let defense = hero.defense;
    if (hero.heroId === T.ID) {
      const rootguard = hero.activeBuffs.find((buff) => buff.id === 'rootguard');
      if (rootguard) {
        defense += rootguard.value * T.ROOTGUARD_STACK;
      }
    }
    return defense;
  }

  private getEffectiveEnemyAttack(enemy: EnemyRuntimeState): number {
    const attackReduce = this.getDebuffStrength(enemy, 'attackReduce');
    return Math.max(COMBAT.MIN_DAMAGE, Math.floor(enemy.attack * (1 - attackReduce)));
  }

  private getDebuffStrength(
    unit: HeroRuntimeState | EnemyRuntimeState,
    type: 'slow' | 'stagger' | 'attackReduce',
  ): number {
    return unit.activeDebuffs
      .filter((debuff) => debuff.type === type && debuff.durationRemaining > 0)
      .reduce((max, debuff) => Math.max(max, debuff.value), 0);
  }

  private getSlowMultiplier(unit: HeroRuntimeState): number {
    const slow = this.getDebuffStrength(unit, 'slow');
    return Math.max(0.1, 1 - slow);
  }

  private getDistance(a: CombatUnit, b: CombatUnit): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isRangedHero(heroClass: HeroClass): boolean {
    return heroClass === 'fighter' || heroClass === 'ranger';
  }

  private getHeroColor(heroId: string): number {
    switch (heroId) {
      case HEROES.KAEL.ID:
        return HEROES.KAEL.COLOR;
      case HEROES.SURA.ID:
        return HEROES.SURA.COLOR;
      case HEROES.MIRA.ID:
        return HEROES.MIRA.COLOR;
      case HEROES.NYRA.ID:
        return HEROES.NYRA.COLOR;
      case R.ID:
        return R.COLOR;
      case SO.ID:
        return SO.COLOR;
      case V.ID:
        return V.COLOR;
      case T.ID:
        return T.COLOR;
      case C.ID:
        return C.COLOR;
      case MK.ID:
        return MK.COLOR;
      default:
        return HEROES.SURA.COLOR;
    }
  }
}
