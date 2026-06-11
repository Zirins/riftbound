// src/entities/Projectile.ts
// Ranged attack projectile — LERP movement toward target, circle collision on hit.

import Phaser from 'phaser';
import { COMBAT } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

export type ProjectileOwnerType = 'hero' | 'enemy';

export interface ProjectileConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  targetId: string;
  ownerId: string;
  ownerType: ProjectileOwnerType;
  speed: number;
  damage: number;
  radius: number;
  color: number;
}

export class Projectile {
  readonly targetId: string;
  readonly ownerId: string;
  readonly ownerType: ProjectileOwnerType;
  readonly speed: number;
  readonly damage: number;
  readonly radius: number;

  x: number;
  y: number;
  active = true;

  private readonly sprite: Phaser.GameObjects.Arc;
  private spriteDestroyed = false;

  constructor(config: ProjectileConfig) {
    this.x = config.x;
    this.y = config.y;
    this.targetId = config.targetId;
    this.ownerId = config.ownerId;
    this.ownerType = config.ownerType;
    this.speed = config.speed;
    this.damage = config.damage;
    this.radius = config.radius;

    this.sprite = config.scene.add.circle(
      this.x,
      this.y,
      this.radius,
      config.color,
    );
  }

  update(
    delta: number,
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): HeroRuntimeState | EnemyRuntimeState | null {
    if (!this.active || this.spriteDestroyed) return null;

    const target = this.resolveTarget(heroes, enemies);
    if (!target || !target.isAlive) {
      this.destroy();
      return null;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.speed * delta) {
      this.x += (dx / dist) * this.speed * delta;
      this.y += (dy / dist) * this.speed * delta;
    } else {
      this.x = target.x;
      this.y = target.y;
    }

    if (!this.spriteDestroyed) {
      this.sprite.setPosition(this.x, this.y);
    }

    if (this.overlapsTarget(target)) {
      this.active = false;
      return target;
    }

    return null;
  }

  destroy(): void {
    if (this.spriteDestroyed) return;
    this.spriteDestroyed = true;
    this.active = false;
    this.sprite.destroy();
  }

  private resolveTarget(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): HeroRuntimeState | EnemyRuntimeState | null {
    if (this.ownerType === 'hero') {
      return enemies.find((e) => e.instanceId === this.targetId) ?? null;
    }
    return heroes.find((h) => h.heroId === this.targetId) ?? null;
  }

  private overlapsTarget(target: HeroRuntimeState | EnemyRuntimeState): boolean {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const reach = this.radius + target.radius;
    return dx * dx + dy * dy < reach * reach;
  }
}

export function createHeroProjectile(
  scene: Phaser.Scene,
  hero: HeroRuntimeState,
  target: EnemyRuntimeState,
  damage: number,
  color: number,
): Projectile {
  return new Projectile({
    scene,
    x: hero.x,
    y: hero.y,
    targetId: target.instanceId,
    ownerId: hero.heroId,
    ownerType: 'hero',
    speed: COMBAT.PROJECTILE_SPEED,
    damage,
    radius: COMBAT.PROJECTILE_RADIUS,
    color,
  });
}
