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

export class AchievementsScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ACHIEVEMENTS;

  private selectedCategory: AchievementCategory = 'combat';
  private backButton: ButtonPrimary | null = null;
  private categoryButtons: ButtonPrimary[] = [];
  private claimButtons: ButtonPrimary[] = [];
  private listTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

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

    if (visibleDefs.length === 0) {
      const empty = this.add.text(CANVAS.WIDTH / 2, LIST_TOP_Y + 40, 'No achievements revealed yet.', {
        fontSize: '12px',
        color: '#888899',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.listTexts.push(empty);
      return;
    }

    visibleDefs.slice(0, 6).forEach((definition, index) => {
      const y = LIST_TOP_Y + index * ROW_HEIGHT;
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

      if (view.completed && !view.claimed) {
        const claimButton = new ButtonPrimary(
          this,
          CANVAS.WIDTH - 80,
          y + 12,
          'CLAIM',
          () => this.handleClaim(definition.id),
          90,
          28,
        );
        this.claimButtons.push(claimButton);
      }
    });

    if (definitions.length > visibleDefs.length) {
      const hiddenCount = definitions.length - visibleDefs.length;
      const hint = this.add.text(
        CANVAS.WIDTH / 2,
        LIST_TOP_Y + LIST_HEIGHT,
        `${hiddenCount} hidden achievement${hiddenCount === 1 ? '' : 's'} remain undiscovered`,
        {
          fontSize: '10px',
          color: '#555566',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5);
      this.listTexts.push(hint);
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
    for (const text of this.listTexts) text.destroy();
    this.listTexts = [];
    for (const button of this.claimButtons) button.destroy();
    this.claimButtons = [];
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
