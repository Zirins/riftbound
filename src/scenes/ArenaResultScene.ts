// src/scenes/ArenaResultScene.ts
// Post-arena battle results — rank change and match rewards.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import * as ArenaMatch from '../systems/ArenaMatchSystem';
import type { ArenaMatchResult } from '../types';

interface ArenaResultSceneData {
  win?: boolean;
}

export class ArenaResultScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ARENA_RESULT;

  private sceneData: ArenaResultSceneData = {};
  private result: ArenaMatchResult | null = null;
  private continueTapZone: Phaser.GameObjects.Zone | null = null;

  constructor() {
    super({ key: ArenaResultScene.KEY });
  }

  init(data: ArenaResultSceneData): void {
    this.sceneData = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const win = this.sceneData.win ?? false;
    this.result = ArenaMatch.resolveMatchResult(win);

    const title = win ? 'ARENA VICTORY' : 'ARENA DEFEAT';
    const titleColor = win ? '#ffee44' : '#ff6666';

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 90, title, {
      fontSize: '28px',
      color: titleColor,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const deltaPrefix = this.result.rankPointsDelta >= 0 ? '+' : '';
    this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 40,
      `Rank Points: ${deltaPrefix}${this.result.rankPointsDelta}  →  ${this.result.newRankPoints.toLocaleString()}`,
      {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 10, `Tier: ${this.result.newTier}`, {
      fontSize: '13px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const rewardLines = win
      ? [
          `Gold: +${this.result.rewardGold}`,
          `Crystals: +${this.result.rewardCrystals}`,
        ]
      : ['No match rewards'];

    this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 30, rewardLines.join('\n'), {
      fontSize: '13px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    if (ArenaMatch.canClaimDailyReward()) {
      this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 80, 'Daily reward ready to claim in arena.', {
        fontSize: '11px',
        color: '#88aa88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    const continueLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 120, '[ CONTINUE ]', {
      fontSize: '18px',
      color: '#44cc88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.continueTapZone = this.add.zone(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 120,
      180,
      40,
    );
    this.continueTapZone.setInteractive({ useHandCursor: true });
    this.continueTapZone.on('pointerup', () => {
      this.scene.start(SCENE_KEYS.RESONANCE_ARENA);
    });

    continueLabel.setDepth(1);
  }

  shutdown(): void {
    this.continueTapZone?.off('pointerup');
    this.continueTapZone?.destroy();
    this.continueTapZone = null;
    this.result = null;
  }
}
