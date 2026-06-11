// src/scenes/VictoryScene.ts
// V0.1: Reward summary, Continue button.

import Phaser from 'phaser';
import { CANVAS, STAGES, UI } from '../constants/gameConfig';
import { MainMenuScene } from './MainMenuScene';

export class VictoryScene extends Phaser.Scene {
  static readonly KEY = 'VictoryScene';

  private titleLabel!: Phaser.GameObjects.Text;
  private stageLabel!: Phaser.GameObjects.Text;
  private rewardLabel!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: VictoryScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 70,
      'VICTORY',
      {
        fontSize: '36px',
        color: '#ffee44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.stageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 20,
      STAGES.STAGE_1.DISPLAY_NAME,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    // TODO(v1.1): wire to currency system — hardcoded V0.1 reward only
    this.rewardLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 20,
      'Gold: 500',
      {
        fontSize: '18px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.continueButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 70,
      '[ CONTINUE ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', this.onContinue, this);
  }

  shutdown(): void {
    this.continueButton?.off('pointerup', this.onContinue, this);
    this.titleLabel?.destroy();
    this.stageLabel?.destroy();
    this.rewardLabel?.destroy();
    this.continueButton?.destroy();
  }

  private readonly onContinue = (): void => {
    this.scene.start(MainMenuScene.KEY);
  };
}
