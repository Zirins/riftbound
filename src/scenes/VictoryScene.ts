// src/scenes/VictoryScene.ts
// V0.1: Reward summary, Continue button.
// Full implementation arrives in Prompt 8.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';

export class VictoryScene extends Phaser.Scene {
  static readonly KEY = 'VictoryScene';

  private label!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: VictoryScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.label = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 30,
      'VICTORY',
      {
        fontSize: '32px',
        color: '#ffee44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.continueButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 40,
      '[ CONTINUE ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.scene.start('MainMenuScene');
      });
  }

  shutdown(): void {
    this.label?.destroy();
    this.continueButton?.destroy();
  }
}
