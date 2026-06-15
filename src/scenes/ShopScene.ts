// src/scenes/ShopScene.ts
// Celestial Market + Void Gem store shell (Phase 28).

import Phaser from 'phaser';
import { CANVAS, MONETIZATION_FLAGS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { ENTITLEMENTS, VOID_GEM_PACKAGES } from '../data/monetization';
import type { ShopItemDefinition } from '../data/shopItems';
import { EconomySystem, canAfford } from '../systems/EconomySystem';
import { isUnlocked } from '../systems/FeatureUnlockSystem';
import { MonetizationService } from '../systems/MonetizationService';
import { PatronSystem } from '../systems/PatronSystem';
import * as ShopSystem from '../systems/ShopSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import { reportProgress } from '../systems/TaskSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const CARD_WIDTH = 130;
const CARD_GAP = 10;
const CARD_Y = 180;

type ShopTab = 'market' | 'void_gems';

function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

interface ShopCardUi {
  buyButton: ButtonPrimary;
  soldLabel: Phaser.GameObjects.Text | null;
}

export class ShopScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SHOP;

  private activeTab: ShopTab = 'market';
  private backButton: ButtonPrimary | null = null;
  private patronButton: ButtonPrimary | null = null;
  private tabMarketButton: ButtonPrimary | null = null;
  private tabVoidButton: ButtonPrimary | null = null;
  private readonly cards: ShopCardUi[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;
  private restartTimer: Phaser.Time.TimerEvent | null = null;
  private headerTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: ShopScene.KEY });
  }

  init(data?: { tab?: ShopTab }): void {
    this.activeTab = data?.tab === 'void_gems' && this.canShowVoidGemStore() ? 'void_gems' : 'market';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    ShopSystem.resetIfNewDay();
    reportProgress('task_visit_shop', 1);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    if (isUnlocked('PATRON_TIER')) {
      this.patronButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 100,
        32,
        'PATRON',
        () => this.scene.start(SCENE_KEYS.PATRON),
        90,
      );
    }

    this.add.text(CANVAS.WIDTH / 2, 32, 'SHOP', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (this.canShowVoidGemStore()) {
      this.tabMarketButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH / 2 - 90,
        58,
        'MARKET',
        () => this.switchTab('market'),
        100,
      );
      this.tabVoidButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH / 2 + 90,
        58,
        'VOID GEMS',
        () => this.switchTab('void_gems'),
        110,
      );
    }

    this.renderActiveTab();
  }

  shutdown(): void {
    this.restartTimer?.remove();
    this.restartTimer = null;
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    for (const card of this.cards) {
      card.buyButton.destroy();
      card.soldLabel?.destroy();
    }
    this.cards.length = 0;
    for (const text of this.headerTexts) text.destroy();
    this.headerTexts = [];
    this.backButton?.destroy();
    this.patronButton?.destroy();
    this.tabMarketButton?.destroy();
    this.tabVoidButton?.destroy();
    this.backButton = null;
    this.patronButton = null;
    this.tabMarketButton = null;
    this.tabVoidButton = null;
    this.toastTimer = null;
    this.toastLabel = null;
  }

  private canShowVoidGemStore(): boolean {
    return MonetizationService.isMonetizationEnabled()
      && MONETIZATION_FLAGS.ENABLE_STORE_UI
      && isUnlocked('VOID_GEM_STORE');
  }

  private switchTab(tab: ShopTab): void {
    this.activeTab = tab;
    this.scene.restart({ tab });
  }

  private renderActiveTab(): void {
    if (this.activeTab === 'void_gems') {
      this.renderVoidGemStore();
      return;
    }
    this.renderCelestialMarket();
  }

  private renderCelestialMarket(): void {
    const stock = ShopSystem.getDailyStock();
    const countdown = formatCountdown(ShopSystem.getRefreshCountdownMs());

    const header = this.add.text(CANVAS.WIDTH / 2, 88, `Celestial Market  ·  Refreshes in ${countdown}`, {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.headerTexts.push(header);

    const totalWidth = stock.length * CARD_WIDTH + (stock.length - 1) * CARD_GAP;
    const startX = (CANVAS.WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;

    stock.forEach((item, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.renderMarketCard(item, x);
    });
  }

  private renderMarketCard(item: ShopItemDefinition, x: number): void {
    this.add.rectangle(x, CARD_Y, CARD_WIDTH, 120, 0x1a1a2e)
      .setStrokeStyle(1, 0x44ccff);

    this.add.text(x, CARD_Y - 42, item.name, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 12 },
    }).setOrigin(0.5);

    this.add.text(x, CARD_Y - 8, ShopSystem.formatCost(item), {
      fontSize: '10px',
      color: item.costType === 'gold' ? '#ffcc00' : '#44aaff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const purchased = ShopSystem.isPurchased(item.id);
    let soldLabel: Phaser.GameObjects.Text | null = null;

    if (purchased) {
      soldLabel = this.add.text(x, CARD_Y + 28, 'SOLD', {
        fontSize: '12px',
        color: '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    const buyButton = new ButtonPrimary(
      this,
      x,
      CARD_Y + 28,
      purchased ? 'SOLD' : 'BUY',
      () => this.handleMarketPurchase(item.id),
      80,
    );
    buyButton.setEnabled(
      !purchased && canAfford(item.costType, item.costAmount),
    );

    this.cards.push({ buyButton, soldLabel });
  }

  private renderVoidGemStore(): void {
    const realm = loadCurrentRealm();
    const save = realm as RealmSaveDataV3 | null;
    const voidGems = save ? EconomySystem.getCurrencyBalance(save, 'void_gem') : 0;
    const patronPoints = save ? PatronSystem.getPatronPoints(save) : 0;
    const patronTier = save ? save.patronState.patronTier : 0;

    const header = this.add.text(
      CANVAS.WIDTH / 2,
      88,
      `Void Gems: ${voidGems}  ·  Patron ${patronTier} (${patronPoints} pts)  ·  TEST BILLING`,
      {
        fontSize: '9px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.headerTexts.push(header);

    const packages = VOID_GEM_PACKAGES;
    const totalWidth = packages.length * CARD_WIDTH + (packages.length - 1) * CARD_GAP;
    const startX = (CANVAS.WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;

    packages.forEach((pkg, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.add.rectangle(x, CARD_Y, CARD_WIDTH, 130, 0x1a1a2e)
        .setStrokeStyle(1, 0xffcc44);

      this.add.text(x, CARD_Y - 48, pkg.name, {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 12 },
      }).setOrigin(0.5);

      this.add.text(x, CARD_Y - 18, `${pkg.voidGems} Void Gems`, {
        fontSize: '10px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x, CARD_Y + 4, pkg.testPriceLabel, {
        fontSize: '9px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x, CARD_Y + 20, `+${pkg.patronPoints} Patron pts`, {
        fontSize: '7px',
        color: '#88aa88',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const buyButton = new ButtonPrimary(
        this,
        x,
        CARD_Y + 44,
        'DEV BUY',
        () => this.handleVoidGemPurchase(pkg.id),
        80,
      );
      this.cards.push({ buyButton, soldLabel: null });
    });

    const entitlementY = CARD_Y + 110;
    const entitlement = ENTITLEMENTS.find((entry) => entry.id === 'rift_veil_card');
    if (entitlement) {
      this.add.text(40, entitlementY, `${entitlement.name} — ${entitlement.description}`, {
        fontSize: '8px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 200 },
      });
      const entButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 100,
        entitlementY + 10,
        'DEV BUY',
        () => this.handleEntitlementPurchase(entitlement.id),
        90,
      );
      this.cards.push({ buyButton: entButton, soldLabel: null });
    }
  }

  private handleMarketPurchase(itemId: string): void {
    if (ShopSystem.purchase(itemId)) {
      this.showToast('Purchased!');
      this.scheduleRestart();
      return;
    }
    this.showToast('Cannot purchase — insufficient funds or already sold.');
  }

  private async handleVoidGemPurchase(packageId: string): Promise<void> {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const result = await MonetizationService.purchaseVoidGemPackage(save, packageId);
    if (result.success) {
      saveCurrentRealm(save);
      this.showToast(`+${result.voidGemsGranted} Void Gems, +${result.patronPointsGranted} Patron pts`);
      this.scheduleRestart();
      return;
    }
    this.showToast(`Purchase failed: ${result.reason ?? 'unknown'}`);
  }

  private async handleEntitlementPurchase(entitlementId: string): Promise<void> {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const result = await MonetizationService.purchaseEntitlement(save, entitlementId);
    if (result.success) {
      saveCurrentRealm(save);
      this.showToast(`Entitlement granted: +${result.voidGemsGranted} Void Gems`);
      this.scheduleRestart();
      return;
    }
    this.showToast(`Purchase failed: ${result.reason ?? 'unknown'}`);
  }

  private scheduleRestart(): void {
    this.restartTimer?.remove();
    this.restartTimer = this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => {
      this.restartTimer = null;
      this.scene.restart({ tab: this.activeTab });
    });
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 60, message, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);
    this.toastTimer = this.time.delayedCall(UI.SHORT_TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
