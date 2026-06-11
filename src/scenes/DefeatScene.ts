// src/scenes/DefeatScene.ts
// V0.1: Retry button, formation hint.
// Full implementation arrives in Prompt 8.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';

export class DefeatScene extends Phaser.Scene {
  static readonly KEY = 'DefeatScene';

  private label!: Phaser.GameObjects.Text;
  private retryButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: DefeatScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.label = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 30,
      'DEFEAT',
      {
        fontSize: '32px',
        color: '#ff4444',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.retryButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 40,
      '[ RETRY ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.scene.start('FormationScene');
      });
  }

  shutdown(): void {
    this.label?.destroy();
    this.retryButton?.destroy();
  }
}
