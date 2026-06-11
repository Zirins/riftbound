// src/scenes/MainMenuScene.ts
// V0.1: Title card, Play button, sound toggle.

import Phaser from 'phaser';
import { APP, CANVAS, UI } from '../constants/gameConfig';
import { loadSettings, saveSettings } from '../systems/SaveSystem';
import { FormationScene } from './FormationScene';

export class MainMenuScene extends Phaser.Scene {
  static readonly KEY = 'MainMenuScene';

  private titleLabel!: Phaser.GameObjects.Text;
  private subtitleLabel!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Text;
  private soundToggle!: Phaser.GameObjects.Text;
  private soundMuted = false;

  constructor() {
    super({ key: MainMenuScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const settings = loadSettings();
    this.soundMuted = settings.soundMuted;
    this.sound.mute = this.soundMuted;

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 50,
      APP.NAME,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.subtitleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 10,
      'Command your Relic Bearers',
      {
        fontSize: '14px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.playButton = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 40,
      '[ PLAY ]',
      {
        fontSize: '20px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', this.onPlay, this);

    this.soundToggle = this.add.text(
      CANVAS.WIDTH - 24,
      CANVAS.HEIGHT - 24,
      this.getSoundToggleLabel(),
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', this.onToggleSound, this);
  }

  shutdown(): void {
    this.playButton?.off('pointerup', this.onPlay, this);
    this.soundToggle?.off('pointerup', this.onToggleSound, this);
    this.titleLabel?.destroy();
    this.subtitleLabel?.destroy();
    this.playButton?.destroy();
    this.soundToggle?.destroy();
  }

  private readonly onPlay = (): void => {
    this.scene.start(FormationScene.KEY);
  };

  private readonly onToggleSound = (): void => {
    this.soundMuted = !this.soundMuted;
    this.sound.mute = this.soundMuted;
    saveSettings({ soundMuted: this.soundMuted });
    this.soundToggle.setText(this.getSoundToggleLabel());
  };

  private getSoundToggleLabel(): string {
    return this.soundMuted ? 'SOUND: OFF' : 'SOUND: ON';
  }
}
