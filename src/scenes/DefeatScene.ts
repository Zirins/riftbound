// src/scenes/DefeatScene.ts
// Defeat screen with partial energy refund and retry.

import Phaser from 'phaser';
import { CANVAS, ENERGY, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import * as EnergySystem from '../systems/EnergySystem';
import { clearFormation } from '../systems/SaveSystem';

interface DefeatSceneData {
  firstHeroName?: string;
  stageId?: string;
  wavesCleared?: number;
  energyCost?: number;
}

export class DefeatScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.DEFEAT;

  private firstHeroName = 'Unknown';
  private stageId = 'stage_1_1';
  private wavesCleared = 0;
  private energyCost = 0;

  private titleLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private fallenLabel!: Phaser.GameObjects.Text;
  private refundLabel!: Phaser.GameObjects.Text;
  private retryBg!: Phaser.GameObjects.Rectangle;
  private retryLabel!: Phaser.GameObjects.Text;
  private changeTeamBg!: Phaser.GameObjects.Rectangle;
  private changeTeamLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: DefeatScene.KEY });
  }

  init(data: DefeatSceneData): void {
    this.firstHeroName = data.firstHeroName ?? 'Unknown';
    this.stageId = data.stageId ?? 'stage_1_1';
    this.wavesCleared = data.wavesCleared ?? 0;
    this.energyCost = data.energyCost ?? 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    if (this.wavesCleared >= 2 && this.energyCost > 0) {
      const refundAmount = Math.floor(this.energyCost * ENERGY.DEFEAT_REFUND_PCT);
      EnergySystem.refund(refundAmount);
    }

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 90,
      'DEFEAT',
      { fontSize: '36px', color: '#ff4444', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.messageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 40,
      'All Relic Bearers have fallen.',
      { fontSize: '16px', color: '#cccccc', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.fallenLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 10,
      `First to fall: ${this.firstHeroName}`,
      { fontSize: '14px', color: '#ff8888', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const refundText = this.wavesCleared >= 2 && this.energyCost > 0
      ? `Energy refunded: ${Math.floor(this.energyCost * ENERGY.DEFEAT_REFUND_PCT)}`
      : '';
    this.refundLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 20,
      refundText,
      { fontSize: '12px', color: '#88aacc', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const buttonY = CANVAS.HEIGHT / 2 + 65;
    const retryX = CANVAS.WIDTH / 2 - 100;
    const changeTeamX = CANVAS.WIDTH / 2 + 110;
    const btnW = 160;
    const btnH = 48;

    this.retryBg = this.add.rectangle(retryX, buttonY, btnW, btnH, 0x2a2a44)
      .setStrokeStyle(2, 0x44ccff)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start(SCENE_KEYS.FORMATION, { stageId: this.stageId });
      });

    this.retryLabel = this.add.text(retryX, buttonY, '[ RETRY ]', {
      fontSize: '18px', color: '#44ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(2001);

    this.changeTeamBg = this.add.rectangle(changeTeamX, buttonY, btnW + 40, btnH, 0x2a2a44)
      .setStrokeStyle(2, 0x44ccff)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        clearFormation();
        this.scene.start(SCENE_KEYS.FORMATION, { stageId: this.stageId });
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
    this.refundLabel?.destroy();
  }
}
