// src/systems/UltimateSystem.ts
// Energy ultimates — manual tap via UltimateButtons only.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HEROES, UI } from '../constants/gameConfig';
import { getNearestLivingEnemy } from './TargetingSystem';
import type { EnemyRuntimeState, GameState, HeroRuntimeState } from '../types';

interface NyraBarrageState {
  heroId: string;
  arrowsRemaining: number;
  cooldownMs: number;
}

export class UltimateSystem extends Phaser.Events.EventEmitter {
  private readonly vfxObjects: Phaser.GameObjects.GameObject[] = [];
  private nyraBarrage: NyraBarrageState | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    super();
  }

  fireUltimate(heroId: string, gameState: GameState): void {
    const hero = gameState.heroes.find((unit) => unit.heroId === heroId);
    if (!hero || !hero.isAlive || hero.currentEnergy < COMBAT.ENERGY_MAX) return;

    switch (heroId) {
      case HEROES.KAEL.ID:
        this.fireKaelIronPulse(hero, gameState);
        break;
      case HEROES.SURA.ID:
        this.fireSuraSolarRend(hero, gameState);
        break;
      case HEROES.MIRA.ID:
        this.fireMiraRiftBloom(hero, gameState);
        break;
      case HEROES.NYRA.ID:
        this.startNyraVoidBarrage(hero, gameState);
        break;
      default:
        return;
    }

    hero.currentEnergy = 0;
    hero.ultimateReady = false;
  }

  update(deltaSeconds: number, gameState: GameState): void {
    if (!this.nyraBarrage) return;

    this.nyraBarrage.cooldownMs -= deltaSeconds * 1000;
    const interval = HEROES.NYRA.BARRAGE_DURATION / HEROES.NYRA.ARROW_COUNT;

    while (this.nyraBarrage.cooldownMs <= 0 && this.nyraBarrage.arrowsRemaining > 0) {
      const hero = gameState.heroes.find((unit) => unit.heroId === this.nyraBarrage?.heroId);
      if (hero?.isAlive) {
        this.fireNyraArrow(hero, gameState);
      }
      this.nyraBarrage.arrowsRemaining -= 1;
      this.nyraBarrage.cooldownMs += interval;
    }

    if (this.nyraBarrage.arrowsRemaining <= 0) {
      this.nyraBarrage = null;
    }
  }

  destroy(): void {
    this.vfxObjects.forEach((object) => object.destroy());
    this.vfxObjects.length = 0;
    this.nyraBarrage = null;
  }

  private trackVfx(object: Phaser.GameObjects.GameObject): void {
    if ('setDepth' in object && typeof object.setDepth === 'function') {
      object.setDepth(UI.ULTIMATE_VFX_DEPTH);
    }
    this.vfxObjects.push(object);
  }

  private fireKaelIronPulse(hero: HeroRuntimeState, gameState: GameState): void {
    const radiusSq = HEROES.KAEL.PULSE_RADIUS * HEROES.KAEL.PULSE_RADIUS;

    for (const enemy of gameState.enemies) {
      if (!enemy.isAlive) continue;
      const dx = hero.x - enemy.x;
      const dy = hero.y - enemy.y;
      if (dx * dx + dy * dy <= radiusSq) {
        this.applyUltimateDamage(enemy, HEROES.KAEL.ULTIMATE_DAMAGE, hero);
      }
    }

    for (const ally of gameState.heroes) {
      if (!ally.isAlive) continue;
      ally.activeBuffs.push({
        id: `shield_${ally.heroId}_${Date.now()}`,
        type: 'shield',
        value: HEROES.KAEL.SHIELD_VALUE,
        durationRemaining: HEROES.KAEL.SHIELD_DURATION,
      });
    }

    const pulse = this.scene.add.circle(hero.x, hero.y, HEROES.KAEL.RADIUS, 0xffffff, 0.7);
    this.trackVfx(pulse);
    this.scene.tweens.add({
      targets: pulse,
      radius: HEROES.KAEL.PULSE_RADIUS,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => pulse.destroy(),
    });
  }

  private fireSuraSolarRend(hero: HeroRuntimeState, gameState: GameState): void {
    const yBand = HEROES.SURA.ULTIMATE_LINE_HALF_HEIGHT;

    for (const enemy of gameState.enemies) {
      if (!enemy.isAlive) continue;
      if (Math.abs(enemy.y - hero.y) > yBand) continue;

      this.applyUltimateDamage(enemy, HEROES.SURA.ULTIMATE_DAMAGE, hero);
      enemy.activeDebuffs.push({
        id: `burn_${enemy.instanceId}_${Date.now()}`,
        type: 'burn',
        value: HEROES.SURA.BURN_DPS,
        durationRemaining: HEROES.SURA.BURN_DURATION,
      });
    }

    const line = this.scene.add.rectangle(
      (CANVAS.HERO_ZONE_END + CANVAS.ENEMY_ZONE_START) / 2,
      hero.y,
      CANVAS.ENEMY_ZONE_START - CANVAS.HERO_ZONE_END,
      yBand * 2,
      HEROES.SURA.COLOR,
      0.75,
    );
    this.trackVfx(line);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => line.destroy(),
    });
  }

  private fireMiraRiftBloom(hero: HeroRuntimeState, gameState: GameState): void {
    for (const ally of gameState.heroes) {
      if (!ally.isAlive) continue;
      ally.currentHP = Math.min(ally.maxHP, ally.currentHP + HEROES.MIRA.ULTIMATE_HEAL);
      if (ally.activeDebuffs.length > 0) {
        ally.activeDebuffs = ally.activeDebuffs.slice(1);
      }

      const pulse = this.scene.add.circle(ally.x, ally.y, ally.radius, HEROES.MIRA.COLOR, 0.6);
      this.trackVfx(pulse);
      this.scene.tweens.add({
        targets: pulse,
        radius: ally.radius * 3,
        alpha: 0,
        duration: UI.ULTIMATE_VFX_DURATION,
        onComplete: () => pulse.destroy(),
      });
    }

    void hero;
  }

  private startNyraVoidBarrage(hero: HeroRuntimeState, gameState: GameState): void {
    const interval = HEROES.NYRA.BARRAGE_DURATION / HEROES.NYRA.ARROW_COUNT;
    this.fireNyraArrow(hero, gameState);
    this.nyraBarrage = {
      heroId: hero.heroId,
      arrowsRemaining: HEROES.NYRA.ARROW_COUNT - 1,
      cooldownMs: interval,
    };
  }

  private fireNyraArrow(hero: HeroRuntimeState, gameState: GameState): void {
    const target = getNearestLivingEnemy(hero, gameState.enemies);
    if (!target) return;

    const arrow = this.scene.add.circle(
      hero.x,
      hero.y,
      COMBAT.PROJECTILE_RADIUS,
      HEROES.NYRA.COLOR,
      1,
    );
    this.trackVfx(arrow);
    this.scene.tweens.add({
      targets: arrow,
      x: target.x,
      y: target.y,
      duration: UI.ULTIMATE_VFX_DURATION / 4,
      onComplete: () => arrow.destroy(),
    });

    const effectiveDefense = target.defense * (1 - HEROES.NYRA.ARMOR_PIERCE);
    const damage = Math.max(COMBAT.MIN_DAMAGE, HEROES.NYRA.ARROW_DAMAGE - effectiveDefense);
    this.applyUltimateDamage(target, damage, hero);
  }

  private applyUltimateDamage(
    enemy: EnemyRuntimeState,
    damage: number,
    attacker: HeroRuntimeState,
  ): void {
    if (!enemy.isAlive) return;

    enemy.currentHP -= damage;
    attacker.attackCounter += 1;

    if (enemy.currentHP <= 0) {
      enemy.currentHP = 0;
      enemy.isAlive = false;
      this.emit('enemyKilled', enemy.instanceId);
    }
  }
}
