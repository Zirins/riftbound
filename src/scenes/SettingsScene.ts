// src/scenes/SettingsScene.ts
// Settings — Phase 12 expands this stub.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { ButtonPrimary } from '../ui/ButtonPrimary';

export class SettingsScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SETTINGS;

  private backButton: ButtonPrimary | null = null;

  constructor() {
    super({ key: SettingsScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.add.text(CANVAS.WIDTH / 2, 80, 'SETTINGS', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, 'SettingsScene stub — Phase 12', {
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
