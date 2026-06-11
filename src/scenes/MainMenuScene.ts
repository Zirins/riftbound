// src/scenes/MainMenuScene.ts
// V0.1: Title card, Play button, sound toggle.
// Gameplay: none — stub only.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';

export class MainMenuScene extends Phaser.Scene {
  static readonly KEY = 'MainMenuScene';

  private label!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: MainMenuScene.KEY });
  }

  create(): void {
    // Background
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    // Title
    this.label = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 40,
      'RIFTBOUND SIGILS',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    // Play button stub
    this.playButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 30,
      '[ PLAY ]',
      {
        fontSize: '20px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        this.scene.start(FormationSceneKey);
      });
  }

  shutdown(): void {
    this.label?.destroy();
    this.playButton?.destroy();
  }
}

// Key reference — avoids circular import from importing FormationScene directly.
const FormationSceneKey = 'FormationScene';
