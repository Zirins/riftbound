// src/ui/UltimateButtons.ts
// HUD portrait buttons — glow when ultimate ready, tap to fire.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HEROES, UI } from '../constants/gameConfig';
import type { GameState, HeroRuntimeState } from '../types';

interface PortraitButton {
  heroId: string;
  glow: Phaser.GameObjects.Arc;
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  tapZone: Phaser.GameObjects.Zone;
}

const PORTRAIT_HEROES = [
  { id: HEROES.KAEL.ID, name: 'Kael', color: HEROES.KAEL.COLOR },
  { id: HEROES.SURA.ID, name: 'Sura', color: HEROES.SURA.COLOR },
  { id: HEROES.MIRA.ID, name: 'Mira', color: HEROES.MIRA.COLOR },
  { id: HEROES.NYRA.ID, name: 'Nyra', color: HEROES.NYRA.COLOR },
] as const;

export class UltimateButtons {
  private readonly portraits: PortraitButton[] = [];
  private hudBackground!: Phaser.GameObjects.Rectangle;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gameState: GameState,
    private readonly onFireUltimate: (heroId: string) => void,
  ) {}

  create(): void {
    const hudDepth = UI.HUD_DEPTH;

    this.hudBackground = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT + CANVAS.HUD_HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HUD_HEIGHT,
      UI.HUD_BACKGROUND,
      UI.HUD_ALPHA,
    );
    this.hudBackground.setDepth(hudDepth);

    const tapWidth = UI.HUD_PORTRAIT_RADIUS * 2;

    PORTRAIT_HEROES.forEach((hero, index) => {
      const x = UI.HUD_PORTRAIT_START_X + index * UI.HUD_PORTRAIT_SPACING;
      const y = UI.HUD_PORTRAIT_Y;

      const glow = this.scene.add.circle(
        x,
        y,
        UI.HUD_PORTRAIT_RADIUS + HEROES.PORTRAIT_GLOW_LINEWIDTH,
        HEROES.PORTRAIT_GLOW_COLOR,
        0,
      );
      glow.setStrokeStyle(HEROES.PORTRAIT_GLOW_LINEWIDTH, HEROES.PORTRAIT_GLOW_COLOR, 1);
      glow.setVisible(false);
      glow.setDepth(hudDepth + 1);

      const circle = this.scene.add.circle(x, y, UI.HUD_PORTRAIT_RADIUS, hero.color);
      circle.setDepth(hudDepth + 2);

      const label = this.scene.add.text(x, y + UI.HUD_PORTRAIT_RADIUS, hero.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      label.setDepth(hudDepth + 3);

      const tapZone = this.scene.add.zone(x, y + 6, tapWidth, UI.HUD_TAP_ZONE_HEIGHT);
      tapZone.setDepth(hudDepth + 5);
      const hitRect = new Phaser.Geom.Rectangle(
        -tapWidth / 2,
        -UI.HUD_TAP_ZONE_HEIGHT / 2,
        tapWidth,
        UI.HUD_TAP_ZONE_HEIGHT,
      );
      tapZone.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
      tapZone.on('pointerdown', () => this.handlePortraitTap(hero.id));

      this.portraits.push({ heroId: hero.id, glow, circle, label, tapZone });
    });
  }

  update(heroes: HeroRuntimeState[]): void {
    for (const portrait of this.portraits) {
      const hero = heroes.find((unit) => unit.heroId === portrait.heroId);
      const isReady = Boolean(
        hero?.isAlive && hero.currentEnergy >= COMBAT.ENERGY_MAX,
      );
      portrait.glow.setVisible(isReady);
      portrait.circle.setAlpha(hero?.isAlive ? 1 : 0.35);
    }
  }

  destroy(): void {
    this.hudBackground?.destroy();
    for (const portrait of this.portraits) {
      portrait.tapZone.destroy();
      portrait.circle.destroy();
      portrait.glow.destroy();
      portrait.label.destroy();
    }
    this.portraits.length = 0;
  }

  private handlePortraitTap(heroId: string): void {
    const hero = this.gameState.heroes.find((unit) => unit.heroId === heroId);
    if (!hero?.isAlive || hero.currentEnergy < COMBAT.ENERGY_MAX) return;
    this.onFireUltimate(heroId);
  }
}
