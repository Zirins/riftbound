// src/systems/UltimateSystem.ts
// Energy ultimates — manual tap via UltimateButtons only.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HERO_NEW, HEROES, UI } from '../constants/gameConfig';
import { findLowestHpLivingEnemy, getNearestLivingEnemy } from './TargetingSystem';
import type { EnemyRuntimeState, GameState, HeroRuntimeState } from '../types';

const R = HERO_NEW.REN;
const SO = HERO_NEW.SOLENNE;
const V = HERO_NEW.VEYRA;
const T = HERO_NEW.THANE;
const C = HERO_NEW.CAIRA;
const MK = HERO_NEW.MAREK;

const REN_MARK_PREFIX = `mark_${R.ID}_`;
const SOLENNE_LINE_HALF_HEIGHT = 50;
const CAIRA_SHIELD_DURATION = 3000;

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
      case R.ID:
        this.fireRenQuietusDash(hero, gameState);
        break;
      case SO.ID:
        this.fireSolenneSunthreadBurst(hero, gameState);
        break;
      case V.ID:
        this.fireVeyraMirrorHex(hero, gameState);
        break;
      case T.ID:
        this.fireThaneIronbarkStand(hero, gameState);
        break;
      case C.ID:
        this.fireCairaVeilOfMorning(hero, gameState);
        break;
      case MK.ID:
        this.fireMarekStormreignCleave(hero, gameState);
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

  private fireRenQuietusDash(hero: HeroRuntimeState, gameState: GameState): void {
    const target = this.getRenDashTarget(hero, gameState.enemies);
    if (!target) return;

    const engageDist = hero.radius + target.radius + 4;
    const dashX = Math.max(hero.radius, target.x - engageDist);
    hero.x = dashX;
    hero.y = target.y;
    hero.targetX = dashX;
    hero.targetY = target.y;

    const effectiveDefense = target.defense * (1 - R.ARMOR_PIERCE);
    const damage = Math.max(COMBAT.MIN_DAMAGE, R.ULTIMATE_DAMAGE - effectiveDefense);
    this.applyUltimateDamage(target, damage, hero);

    target.activeDebuffs = target.activeDebuffs.filter(
      (debuff) => !(debuff.type === 'mark' && debuff.id.startsWith(REN_MARK_PREFIX)),
    );

    const trail = this.scene.add.circle(hero.x, hero.y, hero.radius, R.COLOR, 0.85);
    this.trackVfx(trail);
    this.scene.tweens.add({
      targets: trail,
      x: target.x,
      y: target.y,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION / 2,
      onComplete: () => trail.destroy(),
    });
  }

  private fireSolenneSunthreadBurst(hero: HeroRuntimeState, gameState: GameState): void {
    const yBand = SOLENNE_LINE_HALF_HEIGHT;
    const lineWidth = CANVAS.WIDTH - CANVAS.HERO_ZONE_END;
    const lineCenterX = CANVAS.HERO_ZONE_END + lineWidth / 2;

    for (const enemy of gameState.enemies) {
      if (!enemy.isAlive) continue;
      if (Math.abs(enemy.y - hero.y) > yBand) continue;

      this.applyUltimateDamage(enemy, SO.ULTIMATE_DAMAGE, hero);
      enemy.activeDebuffs.push({
        id: `slow_${enemy.instanceId}_${Date.now()}`,
        type: 'slow',
        value: SO.SLOW_AMOUNT,
        durationRemaining: SO.SLOW_DURATION,
      });
    }

    const line = this.scene.add.rectangle(
      lineCenterX,
      hero.y,
      lineWidth,
      yBand * 2,
      SO.COLOR,
      UI.SOLAR_REND_LINE_ALPHA,
    );
    line.setStrokeStyle(3, 0x88bbff, 1);
    this.trackVfx(line);
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => line.destroy(),
    });
  }

  private fireVeyraMirrorHex(hero: HeroRuntimeState, gameState: GameState): void {
    for (const enemy of gameState.enemies) {
      if (!enemy.isAlive) continue;

      this.applyUltimateDamage(enemy, V.ULTIMATE_DAMAGE, hero);
      enemy.activeDebuffs.push({
        id: `hex_${enemy.instanceId}_${Date.now()}`,
        type: 'attackReduce',
        value: V.HEX_DAMAGE_REDUCTION,
        durationRemaining: V.HEX_DURATION,
      });
    }

    const shard = this.scene.add.circle(
      CANVAS.HERO_ZONE_END + 120,
      CANVAS.BATTLE_HEIGHT / 2,
      80,
      V.COLOR,
      0.35,
    );
    shard.setStrokeStyle(4, 0xff88cc, 0.9);
    this.trackVfx(shard);
    this.scene.tweens.add({
      targets: shard,
      alpha: 0,
      scale: 1.4,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => shard.destroy(),
    });

    void hero;
  }

  private fireThaneIronbarkStand(hero: HeroRuntimeState, gameState: GameState): void {
    hero.activeBuffs.push({
      id: `taunt_${hero.heroId}_${Date.now()}`,
      type: 'taunt',
      value: 1,
      durationRemaining: T.TAUNT_DURATION,
    });
    hero.activeBuffs.push({
      id: `shield_${hero.heroId}_${Date.now()}`,
      type: 'shield',
      value: T.SHIELD_VALUE,
      durationRemaining: T.TAUNT_DURATION,
    });

    const pulse = this.scene.add.circle(hero.x, hero.y, hero.radius, T.COLOR, 0.6);
    pulse.setStrokeStyle(5, 0xaabb66, 1);
    this.trackVfx(pulse);
    this.scene.tweens.add({
      targets: pulse,
      radius: hero.radius * 2.2,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => pulse.destroy(),
    });

    void gameState;
  }

  private fireCairaVeilOfMorning(hero: HeroRuntimeState, gameState: GameState): void {
    for (const ally of gameState.heroes) {
      if (!ally.isAlive) continue;

      ally.currentHP = Math.min(ally.maxHP, ally.currentHP + C.ULTIMATE_HEAL);
      ally.activeBuffs.push({
        id: `shield_${ally.heroId}_${Date.now()}`,
        type: 'shield',
        value: C.SHIELD_VALUE,
        durationRemaining: CAIRA_SHIELD_DURATION,
      });
      if (ally.activeDebuffs.length > 0) {
        ally.activeDebuffs = ally.activeDebuffs.slice(1);
      }

      const pulse = this.scene.add.circle(
        ally.x,
        ally.y,
        ally.radius,
        C.COLOR,
        UI.RIFT_BLOOM_PULSE_ALPHA,
      );
      pulse.setStrokeStyle(4, 0xfff8cc, 1);
      this.trackVfx(pulse);
      this.scene.tweens.add({
        targets: pulse,
        radius: ally.radius * 2,
        alpha: 0,
        duration: UI.ULTIMATE_VFX_DURATION,
        onComplete: () => pulse.destroy(),
      });
    }

    void hero;
  }

  private fireMarekStormreignCleave(hero: HeroRuntimeState, gameState: GameState): void {
    const yBand = MK.CLEAVE_Y_RANGE;

    for (const enemy of gameState.enemies) {
      if (!enemy.isAlive) continue;
      if (Math.abs(enemy.y - hero.y) > yBand) continue;

      this.applyUltimateDamage(enemy, MK.ULTIMATE_DAMAGE, hero);
      enemy.activeDebuffs.push({
        id: `stagger_${enemy.instanceId}_${Date.now()}`,
        type: 'stagger',
        value: MK.STAGGER_SPEED_REDUCE,
        durationRemaining: MK.STAGGER_DURATION,
      });
    }

    const cleave = this.scene.add.rectangle(
      hero.x + 90,
      hero.y,
      180,
      yBand * 2,
      MK.COLOR,
      0.45,
    );
    cleave.setStrokeStyle(3, 0x66ccff, 1);
    this.trackVfx(cleave);
    this.scene.tweens.add({
      targets: cleave,
      x: hero.x + 140,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION / 2,
      onComplete: () => cleave.destroy(),
    });
  }

  private getRenDashTarget(
    hero: HeroRuntimeState,
    enemies: EnemyRuntimeState[],
  ): EnemyRuntimeState | null {
    const living = enemies.filter((enemy) => enemy.isAlive);
    const marked = living.find((enemy) =>
      enemy.activeDebuffs.some(
        (debuff) => debuff.type === 'mark' && debuff.id.startsWith(REN_MARK_PREFIX),
      ),
    );
    return marked ?? findLowestHpLivingEnemy(hero, living);
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
    const lineWidth = CANVAS.WIDTH - CANVAS.HERO_ZONE_END;
    const lineCenterX = CANVAS.HERO_ZONE_END + lineWidth / 2;

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
      lineCenterX,
      hero.y,
      lineWidth,
      yBand * 2,
      HEROES.SURA.COLOR,
      UI.SOLAR_REND_LINE_ALPHA,
    );
    line.setStrokeStyle(3, 0xffaa66, 1);
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

      const pulse = this.scene.add.circle(
        ally.x,
        ally.y,
        ally.radius,
        HEROES.MIRA.COLOR,
        UI.RIFT_BLOOM_PULSE_ALPHA,
      );
      pulse.setStrokeStyle(4, 0xaaffaa, 1);
      this.trackVfx(pulse);
      this.scene.tweens.add({
        targets: pulse,
        radius: ally.radius * HEROES.MIRA.RIFT_BLOOM_PULSE_SCALE,
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
