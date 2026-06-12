// src/scenes/MainMenuScene.ts
// V0.1: Title card, Play button, sound toggle.

import Phaser from 'phaser';
import { APP, CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { migrate } from '../systems/SaveMigrationSystem';
import { hasAnySave, loadSettings, saveSettings } from '../systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.MAIN_MENU;

  private titleLabel!: Phaser.GameObjects.Text;
  private subtitleLabel!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Text;
  private playTapZone!: Phaser.GameObjects.Zone;
  private soundToggle!: Phaser.GameObjects.Text;
  private soundTapZone!: Phaser.GameObjects.Zone;
  private soundMuted = false;

  constructor() {
    super({ key: MainMenuScene.KEY });
  }

  create(): void {
    migrate();

    if (hasAnySave()) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

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

    const playY = CANVAS.HEIGHT / 2 + 40;
    this.playButton = this.add.text(
      CANVAS.WIDTH / 2,
      playY,
      '[ ENTER ASTERRA → ]',
      {
        fontSize: '20px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.playTapZone = this.add.zone(
      CANVAS.WIDTH / 2,
      playY,
      UI.SCENE_NAV_BUTTON_WIDTH,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    this.playTapZone.setInteractive({ useHandCursor: true });
    this.playTapZone.on('pointerup', this.onPlay, this);

    const soundX = CANVAS.WIDTH - 24;
    const soundY = CANVAS.HEIGHT - 24;
    this.soundToggle = this.add.text(
      soundX,
      soundY,
      this.getSoundToggleLabel(),
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(1, 1);

    this.soundTapZone = this.add.zone(
      soundX - UI.SOUND_TOGGLE_ZONE_OFFSET_X,
      soundY - UI.SOUND_TOGGLE_ZONE_OFFSET_Y,
      UI.SOUND_TOGGLE_ZONE_WIDTH,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    this.soundTapZone.setInteractive({ useHandCursor: true });
    this.soundTapZone.on('pointerup', this.onToggleSound, this);
  }

  shutdown(): void {
    this.playTapZone?.off('pointerup', this.onPlay, this);
    this.soundTapZone?.off('pointerup', this.onToggleSound, this);
    this.playTapZone?.destroy();
    this.soundTapZone?.destroy();
    this.titleLabel?.destroy();
    this.subtitleLabel?.destroy();
    this.playButton?.destroy();
    this.soundToggle?.destroy();
  }

  private readonly onPlay = (): void => {
    this.scene.start(SCENE_KEYS.REALM_SELECT);
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
