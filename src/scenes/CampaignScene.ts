// src/scenes/CampaignScene.ts
// Chapter select cards and per-chapter stage map.

import Phaser from 'phaser';
import { ASSET_PATHS } from '../constants/assetPaths';
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
import {
  CHAPTER_CARD_WIDTH,
  ChapterCard,
  type ChapterDef,
  isChapterUnlocked,
} from '../ui/ChapterCard';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const CHAPTER_CARD_Y = 195;
const CHAPTER_CARD_SPACING = 220;

const CHAPTER_DEFINITIONS: Omit<ChapterDef, 'unlocked'>[] = [
  {
    id: 'chapter_1',
    label: 'Chapter 1',
    name: 'Rift Outskirts',
    bgKey: 'bg_ch1',
    stageIds: CHAPTER_1_STAGE_IDS,
  },
  {
    id: 'chapter_2',
    label: 'Chapter 2',
    name: 'The Hollow Reaches',
    bgKey: 'bg_ch2',
    stageIds: CHAPTER_2_STAGE_IDS,
  },
  {
    id: 'chapter_3',
    label: 'Chapter 3',
    name: 'Ironreach Depths',
    bgKey: 'bg_ch3',
    stageIds: CHAPTER_3_STAGE_IDS,
  },
];

const TOP_ROW_Y = 150;
const BOTTOM_ROW_Y = 260;
const ROW_START_X = 120;
const NODE_SPACING = 175;

export class CampaignScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.CAMPAIGN;

  private backButton: ButtonPrimary | null = null;
  private readonly chapterCards: ChapterCard[] = [];
  private readonly nodeZones: Phaser.GameObjects.Zone[] = [];
  private chapterTitleText: Phaser.GameObjects.Text | null = null;
  private activeChapterId: string | null = null;

  private readonly onSceneResume = (): void => {
    if (this.activeChapterId) return;
    this.clearChapterCards();
    const realm = loadCurrentRealm();
    if (!realm) return;
    this.buildChapterCards(realm.clearedStages);
  };

  constructor() {
    super({ key: CampaignScene.KEY });
  }

  init(data?: { chapterId?: string }): void {
    this.activeChapterId = data?.chapterId ?? null;
  }

  preload(): void {
    this.load.image('bg_ch1', ASSET_PATHS.backgrounds.chapter1);
    this.load.image('bg_ch2', ASSET_PATHS.backgrounds.chapter2);
    this.load.image('bg_ch3', ASSET_PATHS.backgrounds.chapter3);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    EnergySystem.computeRegen();

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const clearedStages = realm.clearedStages;

    this.add.text(CANVAS.WIDTH / 2, 24, 'STORY PATH', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (this.activeChapterId) {
      this.renderStageMap(this.activeChapterId, clearedStages);
      this.backButton = new ButtonPrimary(
        this,
        72,
        32,
        '← CHAPTERS',
        () => this.scene.start(SCENE_KEYS.CAMPAIGN),
        120,
      );
    } else {
      this.buildChapterCards(clearedStages);
      this.backButton = new ButtonPrimary(
        this,
        72,
        32,
        '← HUB',
        () => this.scene.start(SCENE_KEYS.HUB),
        110,
      );
      this.events.on(Phaser.Scenes.Events.RESUME, this.onSceneResume);
    }
  }

  shutdown(): void {
    this.events.off(Phaser.Scenes.Events.RESUME, this.onSceneResume);
    this.clearChapterCards();
    this.clearStageMap();

    this.backButton?.destroy();
    this.backButton = null;
    this.activeChapterId = null;
  }

  private buildChapterCards(clearedStages: ClearedStageRecord[]): void {
    const firstCenterX = (CANVAS.WIDTH - (CHAPTER_CARD_WIDTH + CHAPTER_CARD_SPACING * 2)) / 2
      + CHAPTER_CARD_WIDTH / 2;
    const realm = loadCurrentRealm();
    if (!realm) return;

    CHAPTER_DEFINITIONS.forEach((definition, index) => {
      const x = firstCenterX + index * CHAPTER_CARD_SPACING;
      const chapterDef: ChapterDef = {
        ...definition,
        unlocked: isChapterUnlocked(definition.id, clearedStages),
      };
      const card = new ChapterCard(
        this,
        x,
        CHAPTER_CARD_Y,
        chapterDef,
        realm,
        (chapterId) => this.scene.start(SCENE_KEYS.CAMPAIGN, { chapterId }),
      );
      this.chapterCards.push(card);
    });
  }

  private clearChapterCards(): void {
    for (const card of this.chapterCards) card.destroy();
    this.chapterCards.length = 0;
  }

  private renderStageMap(chapterId: string, clearedStages: ClearedStageRecord[]): void {
    const chapter = CHAPTER_DEFINITIONS.find((entry) => entry.id === chapterId);
    if (!chapter) {
      this.scene.start(SCENE_KEYS.CAMPAIGN);
      return;
    }

    const topRow = chapter.stageIds.slice(0, 4);
    const bottomRow = [...chapter.stageIds.slice(4, 8)].reverse();

    this.chapterTitleText = this.add.text(CANVAS.WIDTH / 2, 72, `${chapter.label.toUpperCase()}: ${chapter.name.toUpperCase()}`, {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderRow(topRow, TOP_ROW_Y, clearedStages);
    this.renderRow(bottomRow, BOTTOM_ROW_Y, clearedStages);
  }

  private renderRow(stageIds: string[], y: number, clearedStages: ClearedStageRecord[]): void {
    stageIds.forEach((stageId, index) => {
      const x = ROW_START_X + index * NODE_SPACING;
      const cleared = clearedStages.find((record) => record.stageId === stageId);
      const unlocked = isUnlocked(stageId, clearedStages);
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

  private clearStageMap(): void {
    for (const zone of this.nodeZones) {
      zone.off('pointerup');
      zone.destroy();
    }
    this.nodeZones.length = 0;
    this.chapterTitleText?.destroy();
    this.chapterTitleText = null;
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
