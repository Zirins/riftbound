// src/scenes/CampaignScene.ts
// Chapter 1 stage map with unlock gates and star display.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { ClearedStageRecord } from '../types';
import * as EnergySystem from '../systems/EnergySystem';
import { isUnlocked } from '../systems/StageLoader';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const TOP_ROW_IDS = ['stage_1_1', 'stage_1_2', 'stage_1_3', 'stage_1_4'];
const BOTTOM_ROW_IDS = ['stage_1_8', 'stage_1_7', 'stage_1_6', 'stage_1_5'];

const TOP_ROW_Y = 150;
const BOTTOM_ROW_Y = 260;
const ROW_START_X = 120;
const NODE_SPACING = 175;

export class CampaignScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.CAMPAIGN;

  private backButton: ButtonPrimary | null = null;
  private readonly nodeZones: Phaser.GameObjects.Zone[] = [];

  constructor() {
    super({ key: CampaignScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    EnergySystem.computeRegen();

    const realm = loadCurrentRealm();
    const clearedStages = realm?.clearedStages ?? [];

    this.add.text(CANVAS.WIDTH / 2, 36, 'STORY PATH — CHAPTER 1: RIFT OUTSKIRTS', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderRow(TOP_ROW_IDS, TOP_ROW_Y, clearedStages);
    this.renderRow(BOTTOM_ROW_IDS, BOTTOM_ROW_Y, clearedStages);

    this.backButton = new ButtonPrimary(
      this,
      72,
      CANVAS.HEIGHT - 36,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      110,
    );
  }

  shutdown(): void {
    for (const zone of this.nodeZones) {
      zone.off('pointerup');
      zone.destroy();
    }
    this.nodeZones.length = 0;
    this.backButton?.destroy();
    this.backButton = null;
  }

  private renderRow(
    stageIds: string[],
    y: number,
    clearedStages: ClearedStageRecord[],
  ): void {
    stageIds.forEach((stageId, index) => {
      const x = ROW_START_X + index * NODE_SPACING;
      const cleared = clearedStages.find((record) => record.stageId === stageId);
      const unlocked = isUnlocked(stageId, clearedStages);
      const isBoss = stageId === 'stage_1_8';
      const label = this.formatNodeLabel(stageId, cleared?.stars, unlocked, isBoss);

      const color = unlocked ? (cleared ? '#44ccff' : '#ffffff') : '#666677';
      this.add.text(x, y, label, {
        fontSize: '11px',
        color,
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5);

      if (unlocked) {
        const zone = this.add.zone(x, y, 120, 50);
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          this.scene.start(SCENE_KEYS.STAGE_SELECT, { stageId });
        });
        this.nodeZones.push(zone);
      }
    });
  }

  private formatNodeLabel(
    stageId: string,
    stars: number | undefined,
    unlocked: boolean,
    isBoss: boolean,
  ): string {
    const shortId = stageId.replace('stage_1_', '1-');
    if (!unlocked) return `${shortId}\n🔒`;
    if (stars) {
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      return isBoss ? `${shortId} BOSS\n${starText}` : `${shortId}\n${starText}`;
    }
    return isBoss ? `${shortId} BOSS` : shortId;
  }
}
