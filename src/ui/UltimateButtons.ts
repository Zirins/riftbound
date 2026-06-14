// src/ui/UltimateButtons.ts
// HUD portrait buttons — glow when ultimate ready, tap to fire.
// Includes in-battle Auto Ultimate toggle.

import Phaser from 'phaser';
import { CANVAS, COMBAT, HEROES, UI } from '../constants/gameConfig';
import type { GameState, HeroRuntimeState } from '../types';

export interface HudPortraitConfig {
  id: string;
  name: string;
  color: number;
}

interface PortraitButton {
  heroId: string;
  glow: Phaser.GameObjects.Arc;
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  tapZone: Phaser.GameObjects.Zone;
}

const AUTO_TOGGLE_X = CANVAS.WIDTH - 72;
const AUTO_TOGGLE_WIDTH = 88;
const AUTO_TOGGLE_HEIGHT = 52;

export class UltimateButtons {
  private readonly portraits: PortraitButton[] = [];
  private hudBackground!: Phaser.GameObjects.Rectangle;
  private autoToggleBg!: Phaser.GameObjects.Rectangle;
  private autoToggleLabel!: Phaser.GameObjects.Text;
  private autoToggleState!: Phaser.GameObjects.Text;
  private autoToggleZone!: Phaser.GameObjects.Zone;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gameState: GameState,
    private readonly onFireUltimate: (heroId: string) => void,
    private readonly onAutoUltimateToggle: (enabled: boolean) => void,
  ) {}

  create(portraits: readonly HudPortraitConfig[]): void {
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

    portraits.forEach((hero, index) => {
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

    this.createAutoUltimateToggle(hudDepth);
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

    this.refreshAutoUltimateToggle();
  }

  destroy(): void {
    this.hudBackground?.destroy();
    this.autoToggleZone?.off('pointerdown');
    this.autoToggleZone?.destroy();
    this.autoToggleBg?.destroy();
    this.autoToggleLabel?.destroy();
    this.autoToggleState?.destroy();
    for (const portrait of this.portraits) {
      portrait.tapZone.off('pointerdown');
      portrait.tapZone.destroy();
      portrait.circle.destroy();
      portrait.glow.destroy();
      portrait.label.destroy();
    }
    this.portraits.length = 0;
  }

  private createAutoUltimateToggle(hudDepth: number): void {
    const y = UI.HUD_PORTRAIT_Y;

    this.autoToggleBg = this.scene.add.rectangle(
      AUTO_TOGGLE_X,
      y,
      AUTO_TOGGLE_WIDTH,
      AUTO_TOGGLE_HEIGHT,
      this.gameState.autoUltimate ? 0x335544 : 0x333344,
      0.95,
    );
    this.autoToggleBg.setStrokeStyle(2, this.gameState.autoUltimate ? 0x66cc88 : 0x666688, 1);
    this.autoToggleBg.setDepth(hudDepth + 2);

    this.autoToggleLabel = this.scene.add.text(AUTO_TOGGLE_X, y - 10, 'AUTO', {
      fontSize: '11px',
      color: '#ccccdd',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.autoToggleLabel.setDepth(hudDepth + 3);

    this.autoToggleState = this.scene.add.text(AUTO_TOGGLE_X, y + 10, 'OFF', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.autoToggleState.setDepth(hudDepth + 3);

    this.autoToggleZone = this.scene.add.zone(
      AUTO_TOGGLE_X,
      y,
      AUTO_TOGGLE_WIDTH,
      AUTO_TOGGLE_HEIGHT,
    );
    this.autoToggleZone.setDepth(hudDepth + 5);
    this.autoToggleZone.setInteractive({ useHandCursor: true });
    this.autoToggleZone.on('pointerdown', () => this.handleAutoUltimateToggle());

    this.refreshAutoUltimateToggle();
  }

  private refreshAutoUltimateToggle(): void {
    const enabled = this.gameState.autoUltimate;
    this.autoToggleBg?.setFillStyle(enabled ? 0x335544 : 0x333344);
    this.autoToggleBg?.setStrokeStyle(2, enabled ? 0x66cc88 : 0x666688, 1);
    this.autoToggleState?.setText(enabled ? 'ON' : 'OFF');
    this.autoToggleState?.setColor(enabled ? '#88ffaa' : '#aaaaaa');
  }

  private handleAutoUltimateToggle(): void {
    const nextValue = !this.gameState.autoUltimate;
    this.gameState.autoUltimate = nextValue;
    this.refreshAutoUltimateToggle();
    this.onAutoUltimateToggle(nextValue);
  }

  private handlePortraitTap(heroId: string): void {
    const hero = this.gameState.heroes.find((unit) => unit.heroId === heroId);
    if (!hero?.isAlive || hero.currentEnergy < COMBAT.ENERGY_MAX) return;
    this.onFireUltimate(heroId);
  }
}
