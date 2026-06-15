// src/scenes/CovShopScene.ts
// Sect weekly shop — capped purchases with Sect Coins (Section 27).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { CovShopSystem } from '../systems/CovShopSystem';
import { CovSystem } from '../systems/CovSystem';
import { CovTechSystem } from '../systems/CovTechSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const ROW_HEIGHT = 58;
const LIST_TOP_Y = 108;

export class CovShopScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.COVENANT_SHOP;

  private backButton: ButtonPrimary | null = null;
  private buyButtons: ButtonPrimary[] = [];
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: CovShopScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    if (!CovSystem.isInCovenant(save)) {
      this.scene.start(SCENE_KEYS.COVENANT_HUB);
      return;
    }

    CovShopSystem.ensureCurrentWeek(save);
    saveCurrentRealm(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← SECT HUB',
      () => this.scene.start(SCENE_KEYS.COVENANT_HUB),
      120,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'SECT SHOP', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const coinBalance = EconomySystem.getCurrencyBalance(save, 'covenant_coin');
    this.add.text(CANVAS.WIDTH / 2, 56, `Sect Coins: ${coinBalance}`, {
      fontSize: '12px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const techNote = CovTechSystem.describeShopLimitBonuses(save);
    if (techNote) {
      const note = this.add.text(CANVAS.WIDTH / 2, 76, techNote, {
        fontSize: '10px',
        color: '#44cc88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(note);
    }

    this.renderShopRows(save);
  }

  private renderShopRows(save: RealmSaveDataV3): void {
    const views = CovShopSystem.getShopViews(save);

    views.forEach((view, index) => {
      const y = LIST_TOP_Y + index * ROW_HEIGHT;
      const leftX = 48;

      const name = this.add.text(leftX, y - 10, view.name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(name);

      const limitLabel = view.techBonus > 0
        ? `${view.remaining}/${view.effectiveWeeklyLimit} left (+${view.techBonus} tech)`
        : `${view.remaining}/${view.effectiveWeeklyLimit} left`;
      const detail = this.add.text(
        leftX,
        y + 8,
        `${view.cost} coins  ·  ${limitLabel}`,
        {
          fontSize: '10px',
          color: '#aaaacc',
          fontFamily: 'monospace',
        },
      ).setOrigin(0, 0.5);
      this.rowTexts.push(detail);

      const buyButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 90,
        y,
        'BUY',
        () => this.handlePurchase(view.id),
        72,
        28,
      );
      buyButton.setEnabled(view.canPurchase);
      this.buyButtons.push(buyButton);

      if (!view.canPurchase && view.blockReason) {
        const hint = this.add.text(CANVAS.WIDTH - 90, y + 18, view.blockReason, {
          fontSize: '8px',
          color: '#666688',
          fontFamily: 'monospace',
          align: 'center',
          wordWrap: { width: 100 },
        }).setOrigin(0.5);
        this.rowTexts.push(hint);
      }
    });
  }

  private handlePurchase(itemId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = CovShopSystem.purchaseItem(save, itemId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Purchase failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 50, message, {
      fontSize: '12px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.backButton?.destroy();
    this.backButton = null;

    for (const button of this.buyButtons) button.destroy();
    this.buyButtons.length = 0;

    for (const text of this.rowTexts) text.destroy();
    this.rowTexts.length = 0;
  }
}
