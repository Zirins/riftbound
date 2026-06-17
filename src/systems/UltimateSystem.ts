// src/systems/UltimateSystem.ts
// Ultimate execution — SkillSystem handles mechanics; this class plays VFX and auto-fire.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HERO_NEW, HEROES, UI } from '../constants/gameConfig';
import type { GameState, HeroRuntimeState } from '../types';
import {
  buildBattleState,
  emitNewlyDeadEnemies,
  ensureBattleHero,
  snapshotDeadEnemyIds,
} from './battleStateUtils';
import { SkillSystem } from './SkillSystem';

const SO = HERO_NEW.SOLENNE;
const V = HERO_NEW.VEYRA;
const T = HERO_NEW.THANE;
const C = HERO_NEW.CAIRA;
const MK = HERO_NEW.MAREK;
const R = HERO_NEW.REN;
const ZY = HERO_NEW.ZHAO_YAN;

const SOLENNE_LINE_HALF_HEIGHT = 50;

export class UltimateSystem extends Phaser.Events.EventEmitter {
  private readonly vfxObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    super();
  }

  fireUltimate(heroId: string, gameState: GameState): void {
    const hero = gameState.heroes.find((unit) => unit.heroId === heroId);
    if (!hero || !hero.isAlive || hero.currentEnergy < COMBAT.ENERGY_MAX) return;

    const battleHero = ensureBattleHero(hero);
    if (!battleHero.runtimeKit) return;

    const ultimateId = battleHero.runtimeKit.kit.ultimate.id;
    const battleState = buildBattleState(
      gameState.heroes,
      gameState.enemies,
      gameState.elapsedTimeMs,
    );
    const deadBefore = snapshotDeadEnemyIds(gameState.enemies);
    const result = SkillSystem.castSkill(battleHero, ultimateId, battleState);
    if (!result.success) return;

    hero.ultimateReady = false;
    emitNewlyDeadEnemies(this, deadBefore, gameState.enemies);
    this.playUltimateVfx(ultimateId, hero, gameState);
  }

  update(_deltaSeconds: number, gameState: GameState): void {
    if (!gameState.autoUltimate) return;

    for (const hero of gameState.heroes) {
      if (hero.isAlive && hero.currentEnergy >= COMBAT.ENERGY_MAX) {
        this.fireUltimate(hero.heroId, gameState);
      }
    }
  }

  destroy(): void {
    this.vfxObjects.forEach((object) => object.destroy());
    this.vfxObjects.length = 0;
    this.removeAllListeners();
  }

  private playUltimateVfx(
    ultimateId: string,
    hero: HeroRuntimeState,
    gameState: GameState,
  ): void {
    switch (ultimateId) {
      case 'iron_pulse':
        this.playIronPulseVfx(hero);
        break;
      case 'solar_rend':
        this.playSolarRendVfx(hero);
        break;
      case 'rift_bloom':
        this.playRiftBloomVfx(gameState);
        break;
      case 'void_barrage':
        this.playVoidBarrageVfx(hero, gameState);
        break;
      case 'quietus_dash':
        this.playQuietusDashVfx(hero);
        break;
      case 'sunthread_burst':
        this.playSunthreadBurstVfx(hero);
        break;
      case 'mirror_hex':
        this.playMirrorHexVfx();
        break;
      case 'ironbark_stand':
        this.playIronbarkStandVfx(hero);
        break;
      case 'veil_of_morning':
        this.playVeilOfMorningVfx(gameState);
        break;
      case 'stormreign_cleave':
        this.playStormreignCleaveVfx(hero);
        break;
      case 'flame_eruption':
        this.playFlameEruptionVfx(hero);
        break;
      default:
        break;
    }
  }

  private trackVfx(object: Phaser.GameObjects.GameObject): void {
    if ('setDepth' in object && typeof object.setDepth === 'function') {
      object.setDepth(UI.ULTIMATE_VFX_DEPTH);
    }
    this.vfxObjects.push(object);
  }

  private playIronPulseVfx(hero: HeroRuntimeState): void {
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

  private playSolarRendVfx(hero: HeroRuntimeState): void {
    const yBand = HEROES.SURA.ULTIMATE_LINE_HALF_HEIGHT;
    const lineWidth = CANVAS.WIDTH - CANVAS.HERO_ZONE_END;
    const lineCenterX = CANVAS.HERO_ZONE_END + lineWidth / 2;
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

  private playRiftBloomVfx(gameState: GameState): void {
    for (const ally of gameState.heroes) {
      if (!ally.isAlive) continue;
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
  }

  private playVoidBarrageVfx(hero: HeroRuntimeState, gameState: GameState): void {
    const targets = gameState.enemies
      .filter((enemy) => enemy.isAlive)
      .sort((enemyA, enemyB) => enemyB.x - enemyA.x)
      .slice(0, HEROES.NYRA.ARROW_COUNT);

    for (const target of targets) {
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
    }
  }

  private playQuietusDashVfx(hero: HeroRuntimeState): void {
    const trail = this.scene.add.circle(hero.x, hero.y, hero.radius, R.COLOR, 0.85);
    this.trackVfx(trail);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 1.4,
      duration: UI.ULTIMATE_VFX_DURATION / 2,
      onComplete: () => trail.destroy(),
    });
  }

  private playSunthreadBurstVfx(hero: HeroRuntimeState): void {
    const lineWidth = CANVAS.WIDTH - CANVAS.HERO_ZONE_END;
    const lineCenterX = CANVAS.HERO_ZONE_END + lineWidth / 2;
    const line = this.scene.add.rectangle(
      lineCenterX,
      hero.y,
      lineWidth,
      SOLENNE_LINE_HALF_HEIGHT * 2,
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

  private playMirrorHexVfx(): void {
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
  }

  private playIronbarkStandVfx(hero: HeroRuntimeState): void {
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
  }

  private playVeilOfMorningVfx(gameState: GameState): void {
    for (const ally of gameState.heroes) {
      if (!ally.isAlive) continue;
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
  }

  private playStormreignCleaveVfx(hero: HeroRuntimeState): void {
    const yBand = MK.CLEAVE_Y_RANGE;
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

  private playFlameEruptionVfx(hero: HeroRuntimeState): void {
    const burst = this.scene.add.circle(hero.x, hero.y, ZY.RADIUS, ZY.COLOR, 0.75);
    this.trackVfx(burst);
    this.scene.tweens.add({
      targets: burst,
      radius: ZY.ERUPTION_RADIUS,
      alpha: 0,
      duration: UI.ULTIMATE_VFX_DURATION,
      onComplete: () => burst.destroy(),
    });
  }
}
