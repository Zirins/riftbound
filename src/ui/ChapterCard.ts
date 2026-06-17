// src/ui/ChapterCard.ts
// Portrait chapter select card with battle background art and progress badge.

import Phaser from 'phaser';
import type { ClearedStageRecord, RealmSaveData } from '../types';

export const CHAPTER_CARD_WIDTH = 200;
export const CHAPTER_CARD_HEIGHT = 280;

const BOTTOM_BAR_HEIGHT = 72;
const FALLBACK_COLORS: Record<string, number> = {
  chapter_1: 0x334466,
  chapter_2: 0x443355,
  chapter_3: 0x554433,
};

export interface ChapterDef {
  id: string;
  label: string;
  name: string;
  bgKey: string;
  stageIds: string[];
  unlocked: boolean;
}

export class ChapterCard {
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly artDisplay: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private readonly bottomBar: Phaser.GameObjects.Graphics;
  private readonly chapterLabel: Phaser.GameObjects.Text;
  private readonly chapterName: Phaser.GameObjects.Text;
  private readonly starBadge: Phaser.GameObjects.Text;
  private readonly lockOverlay: Phaser.GameObjects.Rectangle | null;
  private readonly lockIcon: Phaser.GameObjects.Text | null;
  private readonly border: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    chapterDef: ChapterDef,
    saveData: RealmSaveData,
    onSelect: (chapterId: string) => void,
  ) {
    const { earned, max } = getChapterStarCounts(chapterDef, saveData.clearedStages);

    this.border = scene.add.rectangle(x, y, CHAPTER_CARD_WIDTH, CHAPTER_CARD_HEIGHT);
    this.border.setStrokeStyle(2, chapterDef.unlocked ? 0x6688aa : 0x444455);
    this.border.setFillStyle(0x000000, 0);

    this.artDisplay = this.createChapterArt(scene, x, y, chapterDef);

    this.bottomBar = scene.add.graphics();
    this.bottomBar.fillStyle(0x000000, 0.72);
    this.bottomBar.fillRect(
      x - CHAPTER_CARD_WIDTH / 2,
      y + CHAPTER_CARD_HEIGHT / 2 - BOTTOM_BAR_HEIGHT,
      CHAPTER_CARD_WIDTH,
      BOTTOM_BAR_HEIGHT,
    );

    const textBaseY = y + CHAPTER_CARD_HEIGHT / 2 - BOTTOM_BAR_HEIGHT;

    this.chapterLabel = scene.add.text(x, textBaseY + 18, chapterDef.label, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.chapterName = scene.add.text(x, textBaseY + 40, chapterDef.name, {
      fontSize: '10px',
      color: '#ccccdd',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.starBadge = scene.add.text(
      x + CHAPTER_CARD_WIDTH / 2 - 14,
      y - CHAPTER_CARD_HEIGHT / 2 + 16,
      `★ ${earned} / ${max}`,
      {
        fontSize: '10px',
        color: '#ffcc44',
        fontFamily: 'monospace',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      },
    ).setOrigin(1, 0.5);

    if (!chapterDef.unlocked) {
      this.lockOverlay = scene.add.rectangle(
        x,
        y,
        CHAPTER_CARD_WIDTH,
        CHAPTER_CARD_HEIGHT,
        0x222233,
        0.65,
      );
      this.lockIcon = scene.add.text(x, y, '🔒', {
        fontSize: '32px',
      }).setOrigin(0.5);
    } else {
      this.lockOverlay = null;
      this.lockIcon = null;
    }

    this.zone = scene.add.zone(x, y, CHAPTER_CARD_WIDTH, CHAPTER_CARD_HEIGHT);
    if (chapterDef.unlocked) {
      this.zone.setInteractive({ useHandCursor: true });
      this.zone.on('pointerup', () => onSelect(chapterDef.id));
    }
  }

  destroy(): void {
    if (this.zone.input) {
      this.zone.removeAllListeners();
    }
    this.zone.destroy();
    this.border.destroy();
    this.artDisplay.destroy();
    this.bottomBar.destroy();
    this.chapterLabel.destroy();
    this.chapterName.destroy();
    this.starBadge.destroy();
    this.lockOverlay?.destroy();
    this.lockIcon?.destroy();
  }

  private createChapterArt(
    scene: Phaser.Scene,
    x: number,
    y: number,
    chapterDef: ChapterDef,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (!scene.textures.exists(chapterDef.bgKey)) {
      return scene.add.rectangle(
        x,
        y,
        CHAPTER_CARD_WIDTH,
        CHAPTER_CARD_HEIGHT,
        FALLBACK_COLORS[chapterDef.id] ?? 0x333344,
      );
    }

    scene.textures.get(chapterDef.bgKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

    const renderTexture = scene.add.renderTexture(0, 0, CHAPTER_CARD_WIDTH, CHAPTER_CARD_HEIGHT);
    scene.textures.get(renderTexture.texture.key)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    renderTexture.setOrigin(0.5, 0.5);
    renderTexture.setPosition(x, y);

    const tempImage = scene.make.image({ key: chapterDef.bgKey, x: 0, y: 0, add: false });
    const nativeWidth = tempImage.width;
    const nativeHeight = tempImage.height;
    const coverScale = Math.max(
      CHAPTER_CARD_WIDTH / nativeWidth,
      CHAPTER_CARD_HEIGHT / nativeHeight,
    );
    tempImage.setScale(coverScale);
    tempImage.setOrigin(0.5, 0.5);
    renderTexture.draw(tempImage, CHAPTER_CARD_WIDTH / 2, CHAPTER_CARD_HEIGHT / 2);
    tempImage.destroy();

    return renderTexture;
  }
}

function getChapterStarCounts(
  chapterDef: ChapterDef,
  clearedStages: ClearedStageRecord[],
): { earned: number; max: number } {
  const prefix = getStagePrefix(chapterDef.id);
  const earned = clearedStages
    .filter((record) => record.stageId.startsWith(prefix))
    .reduce((sum, record) => sum + record.stars, 0);
  return {
    earned,
    max: chapterDef.stageIds.length * 3,
  };
}

function getStagePrefix(chapterId: string): string {
  switch (chapterId) {
    case 'chapter_1':
      return 'stage_1_';
    case 'chapter_2':
      return 'stage_2_';
    case 'chapter_3':
      return 'stage_3_';
    default:
      return 'stage_';
  }
}

export function isChapterUnlocked(
  chapterId: string,
  clearedStages: ClearedStageRecord[],
): boolean {
  switch (chapterId) {
    case 'chapter_1':
      return true;
    case 'chapter_2':
      return clearedStages.some((record) => record.stageId === 'stage_1_8');
    case 'chapter_3':
      return clearedStages.some((record) => record.stageId === 'stage_2_8');
    default:
      return false;
  }
}
