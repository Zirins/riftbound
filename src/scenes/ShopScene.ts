// src/scenes/ShopScene.ts
// Celestial Market — daily stock, purchases, refresh countdown.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { ShopItemDefinition } from '../data/shopItems';
import * as ShopSystem from '../systems/ShopSystem';
import { reportProgress } from '../systems/TaskSystem';
import { canAfford } from '../systems/EconomySystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const CARD_WIDTH = 130;
const CARD_GAP = 10;
const CARD_Y = 170;

function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

interface ShopCardUi {
  item: ShopItemDefinition;
  buyButton: ButtonPrimary;
  soldLabel: Phaser.GameObjects.Text | null;
}

export class ShopScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SHOP;

  private backButton: ButtonPrimary | null = null;
  private readonly cards: ShopCardUi[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: ShopScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    ShopSystem.resetIfNewDay();
    reportProgress('task_visit_shop', 1);

    const stock = ShopSystem.getDailyStock();
    const countdown = formatCountdown(ShopSystem.getRefreshCountdownMs());

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'CELESTIAL MARKET', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH - 130, 32, `Refreshes in: ${countdown}`, {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const totalWidth = stock.length * CARD_WIDTH + (stock.length - 1) * CARD_GAP;
    const startX = (CANVAS.WIDTH - totalWidth) / 2 + CARD_WIDTH / 2;

    stock.forEach((item, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.renderItemCard(item, x);
    });
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    for (const card of this.cards) {
      card.buyButton.destroy();
      card.soldLabel?.destroy();
    }
    this.cards.length = 0;
    this.backButton?.destroy();
    this.backButton = null;
    this.toastTimer = null;
    this.toastLabel = null;
  }

  private renderItemCard(item: ShopItemDefinition, x: number): void {
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
      () => this.handlePurchase(item.id),
      80,
    );
    buyButton.setEnabled(
      !purchased && canAfford(item.costType, item.costAmount),
    );

    this.cards.push({ item, buyButton, soldLabel });
  }

  private handlePurchase(itemId: string): void {
    if (ShopSystem.purchase(itemId)) {
      this.showToast('Purchased!');
      this.time.delayedCall(400, () => this.scene.restart());
      return;
    }
    this.showToast('Cannot purchase — insufficient funds or already sold.');
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
    this.toastTimer = this.time.delayedCall(2000, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
