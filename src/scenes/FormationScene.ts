// src/scenes/FormationScene.ts
// V0.1: 2×2 formation grid, hero assignment, Battle button.
// Full implementation arrives in Prompt 9.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';

export class FormationScene extends Phaser.Scene {
  static readonly KEY = 'FormationScene';

  private label!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: FormationScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.label = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 30,
      'FORMATION — stub',
      {
        fontSize: '22px',
        color: '#aaaaff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.battleButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 30,
      '[ BATTLE ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.scene.start('BattleScene');
      });
  }

  shutdown(): void {
    this.label?.destroy();
    this.battleButton?.destroy();
  }
}
