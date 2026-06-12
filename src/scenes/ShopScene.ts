// src/scenes/ShopScene.ts
// Celestial Market — Phase 10 expands this stub.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { ButtonPrimary } from '../ui/ButtonPrimary';

export class ShopScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SHOP;

  private backButton: ButtonPrimary | null = null;

  constructor() {
    super({ key: ShopScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.add.text(CANVAS.WIDTH / 2, 80, 'CELESTIAL MARKET', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, 'ShopScene stub — Phase 10', {
      fontSize: '14px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.backButton = new ButtonPrimary(
      this,
      80,
      CANVAS.HEIGHT - 40,
      '← BACK',
      () => this.scene.start(SCENE_KEYS.HUB),
      120,
    );
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.backButton = null;
  }
}
