// src/systems/AutoBattleSystem.ts
// Core combat loop — attack timers, damage resolution, death detection.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HEROES, RANGER } from '../constants/gameConfig';
import { createHeroProjectile, Projectile } from '../entities/Projectile';
import { agentDebugLog } from '../utils/agentDebugLog';
import {
  getEnemyTarget,
  getHeroTarget,
  getNearestLivingEnemy,
  getSupportHealTarget,
} from './TargetingSystem';
import type { EnemyRuntimeState, HeroClass, HeroRuntimeState } from '../types';

type CombatUnit = HeroRuntimeState | EnemyRuntimeState;

export class AutoBattleSystem extends Phaser.Events.EventEmitter {
  private readonly projectiles: Projectile[] = [];
  private readonly pendingTargetCleanups = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {
    super();
  }

  update(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    this.tickProjectiles(heroes, enemies, delta);
    this.tickHeroes(heroes, enemies, delta);
    this.tickEnemies(heroes, enemies, delta);
    this.flushProjectileCleanups();
  }

  clearProjectiles(): void {
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles.length = 0;
    this.pendingTargetCleanups.clear();
  }

  private tickProjectiles(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i += 1) {
      const projectile = this.projectiles[i];
      const wasActive = projectile.active;
      const hitTarget = projectile.update(delta, heroes, enemies);

      if (hitTarget && 'instanceId' in hitTarget) {
        const owner = heroes.find((hero) => hero.heroId === projectile.ownerId);
        if (owner) {
          this.applyDamageToEnemy(hitTarget, projectile.damage, owner);
        }
        projectile.destroy();
        indicesToRemove.push(i);
        continue;
      }

      if (!projectile.active) {
        if (wasActive) {
          this.emit('combatDebug', {
            type: 'orphan',
            targetId: projectile.targetId,
          });
        }
        indicesToRemove.push(i);
      }
    }

    for (let i = indicesToRemove.length - 1; i >= 0; i -= 1) {
      this.projectiles.splice(indicesToRemove[i], 1);
    }
  }

  private tickHeroes(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    for (const hero of heroes) {
      if (!hero.isAlive) continue;

      if (hero.heroClass === 'support') {
        this.tickSupportHeal(hero, heroes, delta);
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

      if (this.isRangedHero(hero.heroClass)) {
        const damage = this.calculateDamage(hero.attack, target.defense);
        this.projectiles.push(
          createHeroProjectile(this.scene, hero, target, damage, this.getHeroColor(hero.heroId)),
        );
        hero.attackCooldownRemaining = hero.attackCooldown;
        continue;
      }

      if (this.getDistance(hero, target) <= hero.attackRange) {
        const damage = this.calculateDamage(hero.attack, target.defense);
        this.applyDamageToEnemy(target, damage, hero);
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

      enemy.attackCooldownRemaining -= delta * 1000;
      if (enemy.attackCooldownRemaining > 0) continue;

      const target = getEnemyTarget(enemy, heroes);
      if (!target) continue;

      if (this.getDistance(enemy, target) <= enemy.attackRange) {
        const damage = this.calculateDamage(enemy.attack, target.defense);
        this.applyDamageToHero(target, damage);
        enemy.attackCooldownRemaining = enemy.attackCooldown;
      }
    }
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

    const step = hero.moveSpeed * delta;
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

    const step = hero.moveSpeed * delta;
    const nextX = hero.x + (dx / dist) * step;
    const nextY = hero.y + (dy / dist) * step;

    hero.x = Math.max(0, Math.min(CANVAS.HERO_ZONE_END - hero.radius, nextX));
    hero.y = nextY;
    hero.targetX = hero.x;
    hero.targetY = hero.y;
  }

  private tickSupportHeal(
    hero: HeroRuntimeState,
    heroes: HeroRuntimeState[],
    delta: number,
  ): void {
    hero.healCooldownRemaining -= delta * 1000;
    if (hero.healCooldownRemaining > 0) return;

    const ally = getSupportHealTarget(hero, heroes);
    if (!ally) {
      hero.healCooldownRemaining = HEROES.MIRA.HEAL_COOLDOWN;
      return;
    }

    ally.currentHP = Math.min(ally.maxHP, ally.currentHP + HEROES.MIRA.PASSIVE_HEAL);
    hero.currentEnergy = Math.min(COMBAT.ENERGY_MAX, hero.currentEnergy + COMBAT.HEAL_ENERGY_GAIN);
    hero.healCooldownRemaining = HEROES.MIRA.HEAL_COOLDOWN;
  }

  private applyDamageToEnemy(
    enemy: EnemyRuntimeState,
    damage: number,
    attacker: HeroRuntimeState,
  ): void {
    if (!enemy.isAlive) return;

    enemy.currentHP -= damage;
    attacker.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      attacker.currentEnergy + COMBAT.ENERGY_GAIN_ON_HIT,
    );
    attacker.attackCounter += 1;

    this.emit('enemyHit', {
      instanceId: enemy.instanceId,
      enemyId: enemy.enemyId,
      damage,
      currentHP: enemy.currentHP,
      maxHP: enemy.maxHP,
    });

    if (enemy.currentHP <= 0) {
      enemy.currentHP = 0;
      enemy.isAlive = false;
      this.pendingTargetCleanups.add(enemy.instanceId);
      // #region agent log
      agentDebugLog({
        hypothesisId: 'C',
        location: 'AutoBattleSystem.ts:applyDamageToEnemy',
        message: 'enemy marked dead — deferred projectile cleanup',
        data: { instanceId: enemy.instanceId },
        runId: 'post-fix',
      });
      // #endregion
      this.emit('combatDebug', { type: 'dead', unitId: enemy.instanceId });
      this.emit('enemyKilled', enemy.instanceId);
    }
  }

  private flushProjectileCleanups(): void {
    if (this.pendingTargetCleanups.size === 0) return;

    let totalRemoved = 0;
    for (const instanceId of this.pendingTargetCleanups) {
      totalRemoved += this.removeProjectilesTargeting(instanceId);
    }
    this.pendingTargetCleanups.clear();

    if (totalRemoved > 0) {
      // #region agent log
      agentDebugLog({
        hypothesisId: 'B',
        location: 'AutoBattleSystem.ts:flushProjectileCleanups',
        message: 'deferred projectile cleanup flushed',
        data: { count: totalRemoved },
        runId: 'post-fix',
      });
      // #endregion
      this.emit('combatDebug', { type: 'cleanup', count: totalRemoved });
    }
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

  private applyDamageToHero(hero: HeroRuntimeState, damage: number): void {
    if (!hero.isAlive) return;

    hero.currentHP -= damage;
    hero.currentEnergy = Math.min(
      COMBAT.ENERGY_MAX,
      hero.currentEnergy + COMBAT.ENERGY_GAIN_ON_TAKEN,
    );

    if (hero.currentHP <= 0) {
      hero.currentHP = 0;
      hero.isAlive = false;
      this.emit('heroKilled', hero.heroId);
    }
  }

  private calculateDamage(attack: number, defense: number): number {
    return Math.max(COMBAT.MIN_DAMAGE, attack - defense);
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
      default:
        return HEROES.SURA.COLOR;
    }
  }
}
