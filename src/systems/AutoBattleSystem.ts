// src/systems/AutoBattleSystem.ts
// Core combat loop — attack timers, damage resolution, death detection.
// Basic nearest-target selection; per-class AI arrives in Prompt 4.

import Phaser from 'phaser';
import { COMBAT, HEROES } from '../constants/gameConfig';
import { createHeroProjectile, Projectile } from '../entities/Projectile';
import type { EnemyRuntimeState, HeroClass, HeroRuntimeState } from '../types';

type CombatUnit = HeroRuntimeState | EnemyRuntimeState;

export class AutoBattleSystem extends Phaser.Events.EventEmitter {
  private readonly projectiles: Projectile[] = [];

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
  }

  clearProjectiles(): void {
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles.length = 0;
  }

  private tickProjectiles(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
    delta: number,
  ): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      const hitTarget = projectile.update(delta, heroes, enemies);

      if (!projectile.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (hitTarget && 'instanceId' in hitTarget) {
        const owner = heroes.find((hero) => hero.heroId === projectile.ownerId);
        if (owner) {
          this.applyDamageToEnemy(hitTarget, projectile.damage, owner);
        }
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
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

      hero.attackCooldownRemaining -= delta * 1000;
      if (hero.attackCooldownRemaining > 0) continue;

      const target = this.findNearestLivingEnemy(hero, enemies);
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

      const target = this.findNearestLivingHero(enemy, heroes);
      if (!target) continue;

      if (this.getDistance(enemy, target) <= enemy.attackRange) {
        const damage = this.calculateDamage(enemy.attack, target.defense);
        this.applyDamageToHero(target, damage);
        enemy.attackCooldownRemaining = enemy.attackCooldown;
      }
    }
  }

  private tickSupportHeal(
    hero: HeroRuntimeState,
    heroes: HeroRuntimeState[],
    delta: number,
  ): void {
    hero.healCooldownRemaining -= delta * 1000;
    if (hero.healCooldownRemaining > 0) return;

    const ally = this.findLowestHpAlly(hero, heroes);
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

    if (enemy.currentHP <= 0) {
      enemy.currentHP = 0;
      enemy.isAlive = false;
      this.emit('enemyKilled', enemy.instanceId);
    }
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

  private findNearestLivingEnemy(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
  ): EnemyRuntimeState | null {
    return this.findNearestLiving(hero, enemies.filter((enemy) => enemy.isAlive));
  }

  private findNearestLivingHero(
    enemy: EnemyRuntimeState,
    heroes: HeroRuntimeState[],
  ): HeroRuntimeState | null {
    return this.findNearestLiving(enemy, heroes.filter((hero) => hero.isAlive));
  }

  private findLowestHpAlly(
    healer: HeroRuntimeState,
    heroes: HeroRuntimeState[],
  ): HeroRuntimeState | null {
    const allies = heroes.filter((hero) => hero.isAlive && hero.heroId !== healer.heroId);
    if (allies.length === 0) return null;

    return allies.reduce((lowest, ally) =>
      ally.currentHP < lowest.currentHP ? ally : lowest,
    );
  }

  private findNearestLiving<T extends CombatUnit>(
    source: CombatUnit,
    candidates: T[],
  ): T | null {
    if (candidates.length === 0) return null;

    return candidates.reduce((nearest, candidate) => {
      const nearestDist = this.getDistance(source, nearest);
      const candidateDist = this.getDistance(source, candidate);
      return candidateDist < nearestDist ? candidate : nearest;
    });
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
