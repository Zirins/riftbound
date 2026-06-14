// src/scenes/CampaignScene.ts
// Campaign stage map with chapter tabs, unlock gates, and star display.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import {
  CHAPTER_1_STAGE_IDS,
  CHAPTER_2_STAGE_IDS,
  CHAPTER_3_STAGE_IDS,
} from '../data/stages';
import type { ClearedStageRecord } from '../types';
import * as EnergySystem from '../systems/EnergySystem';
import { isUnlocked } from '../systems/StageLoader';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

interface ChapterConfig {
  id: string;
  title: string;
  stageIds: string[];
  unlockStageId: string | null;
}

const CHAPTERS: ChapterConfig[] = [
  {
    id: 'chapter_1',
    title: 'CHAPTER 1: RIFT OUTSKIRTS',
    stageIds: CHAPTER_1_STAGE_IDS,
    unlockStageId: null,
  },
  {
    id: 'chapter_2',
    title: 'CHAPTER 2: THE HOLLOW REACHES',
    stageIds: CHAPTER_2_STAGE_IDS,
    unlockStageId: 'stage_2_1',
  },
  {
    id: 'chapter_3',
    title: 'CHAPTER 3: IRONREACH DEPTHS',
    stageIds: CHAPTER_3_STAGE_IDS,
    unlockStageId: 'stage_3_1',
  },
];

const TOP_ROW_Y = 150;
const BOTTOM_ROW_Y = 260;
const ROW_START_X = 120;
const NODE_SPACING = 175;

export class CampaignScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.CAMPAIGN;

  private backButton: ButtonPrimary | null = null;
  private readonly nodeZones: Phaser.GameObjects.Zone[] = [];
  private readonly chapterTabZones: Phaser.GameObjects.Zone[] = [];
  private chapterTitleText: Phaser.GameObjects.Text | null = null;
  private selectedChapterIndex = 0;
  private clearedStages: ClearedStageRecord[] = [];

  constructor() {
    super({ key: CampaignScene.KEY });
  }

  init(data?: { chapterIndex?: number }): void {
    if (data?.chapterIndex !== undefined) {
      this.selectedChapterIndex = data.chapterIndex;
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    EnergySystem.computeRegen();

    const realm = loadCurrentRealm();
    this.clearedStages = realm?.clearedStages ?? [];

    this.add.text(CANVAS.WIDTH / 2, 24, 'STORY PATH', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderChapterTabs();
    this.renderSelectedChapter();

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
    for (const zone of this.chapterTabZones) {
      zone.off('pointerup');
      zone.destroy();
    }
    this.nodeZones.length = 0;
    this.chapterTabZones.length = 0;
    this.chapterTitleText?.destroy();
    this.chapterTitleText = null;
    this.backButton?.destroy();
    this.backButton = null;
  }

  private renderChapterTabs(): void {
    const tabY = 58;
    const tabSpacing = 150;
    const startX = CANVAS.WIDTH / 2 - tabSpacing;

    CHAPTERS.forEach((chapter, index) => {
      const x = startX + index * tabSpacing;
      const unlocked = chapter.unlockStageId
        ? isUnlocked(chapter.unlockStageId, this.clearedStages)
        : true;
      const selected = index === this.selectedChapterIndex;
      const label = unlocked ? `Ch.${index + 1}` : `Ch.${index + 1} 🔒`;
      const color = selected ? '#44ccff' : unlocked ? '#ccccdd' : '#666677';

      this.add.text(x, tabY, label, {
        fontSize: '12px',
        color,
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (unlocked) {
        const zone = this.add.zone(x, tabY, 80, 28);
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          if (this.selectedChapterIndex === index) return;
          this.scene.restart({ chapterIndex: index });
        });
        this.chapterTabZones.push(zone);
      }
    });
  }

  private renderSelectedChapter(): void {
    const chapter = CHAPTERS[this.selectedChapterIndex];
    const topRow = chapter.stageIds.slice(0, 4);
    const bottomRow = [...chapter.stageIds.slice(4, 8)].reverse();

    this.chapterTitleText = this.add.text(CANVAS.WIDTH / 2, 92, chapter.title, {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderRow(topRow, TOP_ROW_Y);
    this.renderRow(bottomRow, BOTTOM_ROW_Y);
  }

  private renderRow(stageIds: string[], y: number): void {
    stageIds.forEach((stageId, index) => {
      const x = ROW_START_X + index * NODE_SPACING;
      const cleared = this.clearedStages.find((record) => record.stageId === stageId);
      const unlocked = isUnlocked(stageId, this.clearedStages);
      const isBoss = stageId.endsWith('_8');
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
    const parts = stageId.replace('stage_', '').split('_');
    const shortId = `${parts[0]}-${parts[1]}`;
    if (!unlocked) return `${shortId}\n🔒`;
    if (stars) {
      const starText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      return isBoss ? `${shortId} BOSS\n${starText}` : `${shortId}\n${starText}`;
    }
    return isBoss ? `${shortId} BOSS` : shortId;
  }
}
