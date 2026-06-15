// src/scenes/PatronScene.ts
// Patron Tier — cosmetics/QoL loyalty display (Section 34).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { PATRON_TIER_THRESHOLDS } from '../data/patronPerks';
import { isUnlocked } from '../systems/FeatureUnlockSystem';
import { PatronSystem } from '../systems/PatronSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const ROW_HEIGHT = 22;

export class PatronScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.PATRON;

  private backButton: ButtonPrimary | null = null;
  private storeButton: ButtonPrimary | null = null;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: PatronScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    if (!isUnlocked('PATRON_TIER')) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    PatronSystem.syncPatronTier(save);
    saveCurrentRealm(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.storeButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 100,
      32,
      'STORE',
      () => this.scene.start(SCENE_KEYS.SHOP, { tab: 'void_gems' }),
      90,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'PATRON TIER', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderHeader(save);
    this.renderPerkList(save);
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    for (const row of this.rowTexts) row.destroy();
    this.rowTexts = [];
    this.backButton?.destroy();
    this.storeButton?.destroy();
    this.backButton = null;
    this.storeButton = null;
    this.toastLabel = null;
    this.toastTimer = null;
  }

  private renderHeader(save: RealmSaveDataV3): void {
    const points = PatronSystem.getPatronPoints(save);
    const tier = PatronSystem.syncPatronTier(save);
    const progress = PatronSystem.getPointsForNextTier(points);

    const tierLabel = PatronSystem.formatTierLabel(tier);
    this.add.text(CANVAS.WIDTH / 2, 58, `${tierLabel}  ·  ${points.toLocaleString()} Patron Points`, {
      fontSize: '11px',
      color: '#ffcc66',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const barX = 120;
    const barW = CANVAS.WIDTH - 240;
    const barY = 78;
    this.add.rectangle(barX, barY, barW, 10, 0x222244).setOrigin(0, 0.5);

    let fillRatio = 1;
    let progressLabel = 'Max tier reached';
    if (progress) {
      fillRatio = Math.min(1, progress.current / progress.next);
      progressLabel = `${progress.current} / ${progress.next} to Tier ${tier + 1} (${progress.required} pts)`;
    }

    this.add.rectangle(barX, barY, Math.max(4, barW * fillRatio), 10, 0xcc9944).setOrigin(0, 0.5);
    this.add.text(CANVAS.WIDTH / 2, 96, progressLabel, {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(40, 112, 'Perks are cosmetic/QoL only — effect wiring is future work (Phase 28 = state + UI).', {
      fontSize: '8px',
      color: '#777788',
      fontFamily: 'monospace',
    });
  }

  private renderPerkList(save: RealmSaveDataV3): void {
    const tier = save.patronState.patronTier;
    const perks = PatronSystem.getPerkListForDisplay(tier);

    this.add.text(40, 128, 'TIER', {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    });
    this.add.text(80, 128, 'PERK', {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    });
    this.add.text(CANVAS.WIDTH - 120, 128, 'STATUS', {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    perks.forEach((perk, index) => {
      const y = 148 + index * ROW_HEIGHT;
      const threshold = PATRON_TIER_THRESHOLDS[perk.tier] ?? 0;
      const unlocked = perk.unlocked;
      const statusColor = unlocked ? '#66ff99' : '#666677';
      const statusLabel = unlocked ? 'UNLOCKED' : `🔒 ${threshold}+ pts`;
      const followUp = perk.effectStatus === 'follow_up' ? ' (effect TBD)' : '';

      const tierText = this.add.text(40, y, `${perk.tier}`, {
        fontSize: '9px',
        color: unlocked ? '#ffffff' : '#888899',
        fontFamily: 'monospace',
      });
      const perkText = this.add.text(80, y, `${perk.label}${followUp}`, {
        fontSize: '8px',
        color: unlocked ? '#ffffff' : '#aaaaaa',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 220 },
      });
      const statusText = this.add.text(CANVAS.WIDTH - 120, y, statusLabel, {
        fontSize: '8px',
        color: statusColor,
        fontFamily: 'monospace',
      });

      this.rowTexts.push(tierText, perkText, statusText);
    });
  }
}
