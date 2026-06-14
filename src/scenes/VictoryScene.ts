// src/scenes/VictoryScene.ts
// Campaign victory — displays rewards and grants via RewardSystem.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getSigilDefinition } from '../data/sigils';
import { getStageData } from '../systems/StageLoader';
import { grantReward } from '../systems/RewardSystem';
import type { BattlePerformance, StageReward } from '../types';

interface VictorySceneData {
  stageId?: string;
  rewards?: StageReward | null;
  performance?: BattlePerformance;
  energyCost?: number;
}

export class VictoryScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.VICTORY;

  private rewardGranted = false;
  private titleLabel!: Phaser.GameObjects.Text;
  private stageLabel!: Phaser.GameObjects.Text;
  private starsLabel!: Phaser.GameObjects.Text;
  private rewardLabel!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private continueTapZone!: Phaser.GameObjects.Zone;

  constructor() {
    super({ key: VictoryScene.KEY });
  }

  init(data: VictorySceneData): void {
    this.rewardGranted = false;
    this.sceneData = data;
  }

  private sceneData: VictorySceneData = {};

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const stageId = this.sceneData.stageId ?? 'stage_1_1';
    const stageData = getStageData(stageId);
    const rewards = this.sceneData.rewards;

    this.titleLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 90,
      'VICTORY',
      { fontSize: '36px', color: '#ffee44', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.stageLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 45,
      stageData?.name ?? stageId,
      { fontSize: '14px', color: '#ffffff', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const stars = rewards?.stars ?? 0;
    const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.starsLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 15,
      starText,
      { fontSize: '20px', color: '#ffcc22', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const rewardLines = rewards
      ? [
          `Gold: +${rewards.gold}`,
          `Crystals: +${rewards.crystals}`,
          `XP Fragments: +${rewards.xpFragments}`,
          ...rewards.shardGrants.map((grant) => `Shards: +${grant.amount} (${grant.heroId})`),
          ...rewards.sigilGrants.map((grant) => {
            const definition = getSigilDefinition(grant.sigilDefinitionId);
            return `Sigil: ${definition?.name ?? grant.sigilDefinitionId}`;
          }),
          ...rewards.firstClearItemGrants.map((grant) =>
            grant.itemId === 'awakening_crystal'
              ? `Awakening Crystal ×${grant.quantity}`
              : `${grant.itemId} ×${grant.quantity}`,
          ),
        ]
      : ['No rewards'];
    this.rewardLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 25,
      rewardLines.join('\n'),
      { fontSize: '14px', color: '#ffcc44', fontFamily: 'monospace', align: 'center' },
    ).setOrigin(0.5);

    if (rewards && !this.rewardGranted) {
      grantReward(rewards);
      this.rewardGranted = true;
    }

    const continueY = CANVAS.HEIGHT / 2 + 95;
    this.continueButton = this.add.text(
      CANVAS.WIDTH / 2,
      continueY,
      '[ CONTINUE ]',
      { fontSize: '18px', color: '#44ccff', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.continueTapZone = this.add.zone(
      CANVAS.WIDTH / 2,
      continueY,
      UI.SCENE_NAV_BUTTON_WIDTH,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    this.continueTapZone.setInteractive({ useHandCursor: true });
    this.continueTapZone.on('pointerup', this.onContinue, this);
  }

  shutdown(): void {
    this.continueTapZone?.off('pointerup', this.onContinue, this);
    this.continueTapZone?.destroy();
    this.titleLabel?.destroy();
    this.stageLabel?.destroy();
    this.starsLabel?.destroy();
    this.rewardLabel?.destroy();
    this.continueButton?.destroy();
  }

  private readonly onContinue = (): void => {
    this.scene.start(SCENE_KEYS.CAMPAIGN);
  };
}
