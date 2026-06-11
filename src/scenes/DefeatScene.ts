// src/scenes/DefeatScene.ts
// V0.1: Retry button, formation hint, first-fallen hero.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { clearFormation } from '../systems/SaveSystem';

interface DefeatSceneData {
  firstHeroName?: string;
}

export class DefeatScene extends Phaser.Scene {
  static readonly KEY = 'DefeatScene';

  private firstHeroName = 'Unknown';
  private titleLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private fallenLabel!: Phaser.GameObjects.Text;
  private retryBg!: Phaser.GameObjects.Rectangle;
  private retryLabel!: Phaser.GameObjects.Text;
  private changeTeamBg!: Phaser.GameObjects.Rectangle;
  private changeTeamLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DefeatScene' });
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
      { fontSize: '36px', color: '#ff4444', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.messageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 30,
      'All Relic Bearers have fallen.',
      { fontSize: '16px', color: '#cccccc', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.fallenLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 5,
      `First to fall: ${this.firstHeroName}`,
      { fontSize: '14px', color: '#ff8888', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const buttonY = CANVAS.HEIGHT / 2 + 60;
    const retryX = CANVAS.WIDTH / 2 - 100;
    const changeTeamX = CANVAS.WIDTH / 2 + 110;
    const btnW = 160;
    const btnH = 48;

    // ── Retry ──────────────────────────────────────────────────────────────
    this.retryBg = this.add.rectangle(retryX, buttonY, btnW, btnH, 0x2a2a44)
      .setStrokeStyle(2, 0x44ccff)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('FormationScene');
      });

    this.retryLabel = this.add.text(retryX, buttonY, '[ RETRY ]', {
      fontSize: '18px', color: '#44ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(2001);

    // ── Change Team ────────────────────────────────────────────────────────
    this.changeTeamBg = this.add.rectangle(changeTeamX, buttonY, btnW + 40, btnH, 0x2a2a44)
      .setStrokeStyle(2, 0x44ccff)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        clearFormation();
        this.scene.start('FormationScene');
      });

    this.changeTeamLabel = this.add.text(changeTeamX, buttonY, '[ CHANGE TEAM ]', {
      fontSize: '18px', color: '#44ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(2001);

  }

  shutdown(): void {
    this.retryBg?.removeAllListeners();
    this.retryBg?.destroy();
    this.retryLabel?.destroy();
    this.changeTeamBg?.removeAllListeners();
    this.changeTeamBg?.destroy();
    this.changeTeamLabel?.destroy();
    this.titleLabel?.destroy();
    this.messageLabel?.destroy();
    this.fallenLabel?.destroy();
  }
}
