// src/scenes/DefeatScene.ts
// V0.1: Retry button, formation hint, first-fallen hero.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { clearFormation } from '../systems/SaveSystem';
import { FormationScene } from './FormationScene';

interface DefeatSceneData {
  firstHeroName?: string;
}

export class DefeatScene extends Phaser.Scene {
  static readonly KEY = 'DefeatScene';

  private firstHeroName = 'Unknown';
  private titleLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private fallenLabel!: Phaser.GameObjects.Text;
  private retryButton!: Phaser.GameObjects.Text;
  private changeTeamButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: DefeatScene.KEY });
  }

  init(data: DefeatSceneData): void {
    this.firstHeroName = data.firstHeroName ?? 'Unknown';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 80,
      'DEFEAT',
      {
        fontSize: '36px',
        color: '#ff4444',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.messageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 30,
      'All Relic Bearers have fallen.',
      {
        fontSize: '16px',
        color: '#cccccc',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.fallenLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 5,
      `First to fall: ${this.firstHeroName}`,
      {
        fontSize: '14px',
        color: '#ff8888',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.retryButton = this.add.text(
      CANVAS.WIDTH / 2 - 90,
      CANVAS.HEIGHT / 2 + 60,
      '[ RETRY ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', this.onRetry, this);

    this.changeTeamButton = this.add.text(
      CANVAS.WIDTH / 2 + 90,
      CANVAS.HEIGHT / 2 + 60,
      '[ CHANGE TEAM ]',
      {
        fontSize: '18px',
        color: '#44ccff',
        fontFamily: 'monospace',
      },
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', this.onChangeTeam, this);
  }

  shutdown(): void {
    this.retryButton?.off('pointerup', this.onRetry, this);
    this.changeTeamButton?.off('pointerup', this.onChangeTeam, this);
    this.titleLabel?.destroy();
    this.messageLabel?.destroy();
    this.fallenLabel?.destroy();
    this.retryButton?.destroy();
    this.changeTeamButton?.destroy();
  }

  private readonly onRetry = (): void => {
    this.scene.start(FormationScene.KEY);
  };

  private readonly onChangeTeam = (): void => {
    clearFormation();
    this.scene.start(FormationScene.KEY);
  };
}
