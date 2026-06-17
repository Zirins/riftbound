// src/scenes/AchievementsScene.ts
// Achievement list by category with progress and claim (Section 23).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CATEGORY_LABELS,
  getAchievementsByCategory,
  type AchievementCategory,
} from '../data/achievements';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { AchievementSystem } from '../systems/AchievementSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const ROW_HEIGHT = 52;
const LIST_TOP_Y = 118;
const LIST_HEIGHT = 210;
const LIST_WIDTH = CANVAS.WIDTH - 80;

interface ListClaimButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class AchievementsScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ACHIEVEMENTS;

  private selectedCategory: AchievementCategory = 'combat';
  private backButton: ButtonPrimary | null = null;
  private categoryButtons: ButtonPrimary[] = [];
  private listContainer: Phaser.GameObjects.Container | null = null;
  private listMaskRect: Phaser.GameObjects.Rectangle | null = null;
  private listScrollOffset = 0;
  private listMaxScrollY = 0;
  private readonly listClaimButtons: ListClaimButton[] = [];
  private listTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  private readonly onListWheel = (
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (!this.listContainer || this.listMaxScrollY <= 0) return;
    this.listScrollOffset = Phaser.Math.Clamp(
      this.listScrollOffset + deltaY * 0.6,
      0,
      this.listMaxScrollY,
    );
    this.listContainer.setY(LIST_TOP_Y - this.listScrollOffset);
  };

  constructor() {
    super({ key: AchievementsScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    AchievementSystem.syncSnapshotAchievements(save);
    saveCurrentRealm(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    const claimAllCount = AchievementSystem.getUnclaimedCount(save);
    const claimAll = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 140,
      72,
      claimAllCount > 0 ? 'CLAIM ALL' : 'NO CLAIMS',
      () => {
        const current = loadCurrentRealm();
        if (!current) return;
        const updated = current as RealmSaveDataV3;
        AchievementSystem.syncSnapshotAchievements(updated);
        const claimed = AchievementSystem.claimAllCompleted(updated);
        if (claimed <= 0) {
          this.showToast('No claimable achievements');
          return;
        }
        saveCurrentRealm(updated);
        this.showToast(`Claimed ${claimed} achievement reward${claimed === 1 ? '' : 's'}!`);
        this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
      },
      160,
      28,
    );
    if (claimAllCount <= 0) claimAll.setEnabled(false);
    this.categoryButtons.push(claimAll);

    this.add.text(CANVAS.WIDTH / 2, 32, 'ACHIEVEMENTS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const unclaimed = AchievementSystem.getUnclaimedCount(save);
    this.add.text(CANVAS.WIDTH - 40, 32, `Unclaimed: ${unclaimed}`, {
      fontSize: '11px',
      color: unclaimed > 0 ? '#ffcc44' : '#888899',
      fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    this.buildCategoryTabs();
    this.renderAchievementList(save);
  }

  private buildCategoryTabs(): void {
    const tabWidth = 96;
    const startX = 60;
    const y = 72;

    ACHIEVEMENT_CATEGORIES.forEach((category, index) => {
      const label = ACHIEVEMENT_CATEGORY_LABELS[category].toUpperCase();
      const button = new ButtonPrimary(
        this,
        startX + index * (tabWidth + 6),
        y,
        label,
        () => {
          this.selectedCategory = category;
          this.scene.restart();
        },
        tabWidth,
        28,
      );

      if (category === this.selectedCategory) {
        button.setText(label);
      }

      this.categoryButtons.push(button);
    });
  }

  private renderAchievementList(save: RealmSaveDataV3): void {
    this.clearList();

    const definitions = getAchievementsByCategory(this.selectedCategory)
      .filter((def) => AchievementSystem.isVisible(save, def) || def.isHidden);

    const visibleDefs = this.selectedCategory === 'hidden'
      ? definitions.filter((def) => AchievementSystem.isCompleted(save, def.id))
      : definitions.filter((def) => !def.isHidden);

    const listContainer = this.add.container(0, LIST_TOP_Y);
    this.listContainer = listContainer;

    if (visibleDefs.length === 0) {
      const empty = this.add.text(CANVAS.WIDTH / 2, 40, 'No achievements revealed yet.', {
        fontSize: '12px',
        color: '#888899',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.listTexts.push(empty);
      listContainer.add(empty);
      this.setupListScroll(ROW_HEIGHT);
      return;
    }

    visibleDefs.forEach((definition, index) => {
      const y = index * ROW_HEIGHT;
      const view = AchievementSystem.getViewState(save, definition);

      const statusColor = view.claimed
        ? '#666677'
        : view.completed
          ? '#ffcc44'
          : '#ccccdd';

      const progressText = view.claimed
        ? 'CLAIMED'
        : view.completed
          ? 'READY'
          : `${view.currentProgress}/${view.targetProgress}`;

      const title = this.add.text(40, y, view.name, {
        fontSize: '12px',
        color: statusColor,
        fontFamily: 'monospace',
      });
      const desc = this.add.text(40, y + 16, view.description, {
        fontSize: '10px',
        color: '#888899',
        fontFamily: 'monospace',
      });
      const progress = this.add.text(340, y + 8, progressText, {
        fontSize: '11px',
        color: statusColor,
        fontFamily: 'monospace',
      });

      this.listTexts.push(title, desc, progress);
      listContainer.add([title, desc, progress]);

      if (view.completed && !view.claimed) {
        this.addListClaimButton(listContainer, CANVAS.WIDTH - 80, y + 12, () => {
          this.handleClaim(definition.id);
        });
      }
    });

    if (definitions.length > visibleDefs.length) {
      const hiddenCount = definitions.length - visibleDefs.length;
      const hintY = visibleDefs.length * ROW_HEIGHT + 8;
      const hint = this.add.text(
        CANVAS.WIDTH / 2,
        hintY,
        `${hiddenCount} hidden achievement${hiddenCount === 1 ? '' : 's'} remain undiscovered`,
        {
          fontSize: '10px',
          color: '#555566',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5);
      this.listTexts.push(hint);
      listContainer.add(hint);
    }

    const totalHeight = visibleDefs.length * ROW_HEIGHT
      + (definitions.length > visibleDefs.length ? 28 : 0);
    this.setupListScroll(totalHeight);
  }

  private addListClaimButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    onClick: () => void,
  ): void {
    const bg = this.add.rectangle(x, y, 90, 28, 0x3355aa);
    const label = this.add.text(x, y, 'CLAIM', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 90, 28);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    parent.add([bg, label, zone]);
    this.listClaimButtons.push({ bg, label, zone });
  }

  private setupListScroll(totalHeight: number): void {
    if (!this.listContainer) return;

    this.listMaskRect = this.add.rectangle(
      CANVAS.WIDTH / 2,
      LIST_TOP_Y + LIST_HEIGHT / 2,
      LIST_WIDTH,
      LIST_HEIGHT,
      0x000000,
      0,
    );
    this.listContainer.setMask(this.listMaskRect.createGeometryMask());

    this.listScrollOffset = 0;
    this.listMaxScrollY = Math.max(0, totalHeight - LIST_HEIGHT);
    this.listContainer.setY(LIST_TOP_Y);

    if (this.listMaxScrollY > 0) {
      this.input.on('wheel', this.onListWheel);
    }
  }

  private handleClaim(achievementId: string): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const result = AchievementSystem.claimAchievement(save, achievementId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Cannot claim');
      return;
    }

    saveCurrentRealm(save);
    this.showToast('Achievement reward claimed!');
    this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 50, message, {
      fontSize: '12px',
      color: '#ffee88',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.SHORT_TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  private clearList(): void {
    this.input.off('wheel', this.onListWheel);

    for (const button of this.listClaimButtons) {
      button.zone.off('pointerup');
    }
    this.listClaimButtons.length = 0;

    this.listContainer?.destroy(true);
    this.listContainer = null;
    this.listMaskRect?.destroy();
    this.listMaskRect = null;
    this.listScrollOffset = 0;
    this.listMaxScrollY = 0;
    this.listTexts = [];
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.backButton?.destroy();
    this.backButton = null;
    for (const button of this.categoryButtons) button.destroy();
    this.categoryButtons = [];
    this.clearList();
  }
}
