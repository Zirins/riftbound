// src/scenes/InventoryScene.ts
// V2 inventory UI — category tabs, quantities, and item detail panel.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getItemsByCategory, type ItemCategory, type ItemRarity } from '../data/items';
import { HEROES_DATA } from '../data/heroes';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import type { CurrencyType, RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import {
  InventoryCategoryTabs,
  type InventoryTabId,
} from '../ui/InventoryCategoryTabs';
import {
  InventoryDetailPanel,
  type InventoryDisplayEntry,
} from '../ui/InventoryDetailPanel';
import { InventoryItemGrid } from '../ui/InventoryItemGrid';

interface CurrencyDisplayConfig {
  id: string;
  name: string;
  description: string;
  currencyType: CurrencyType;
  iconPath: string;
  rarity: ItemRarity;
}

const CURRENCY_DISPLAY: CurrencyDisplayConfig[] = [
  {
    id: 'gold',
    name: 'Gold',
    description: 'Standard currency for upgrades, shops, and crafting.',
    currencyType: 'gold',
    iconPath: 'assets/currencies/gold.png',
    rarity: 'common',
  },
  {
    id: 'rift_crystal',
    name: 'Rift Crystal',
    description: 'Premium summon currency drawn from the Eternal Rift.',
    currencyType: 'rift_crystal',
    iconPath: 'assets/currencies/rift_crystal.png',
    rarity: 'rare',
  },
  {
    id: 'void_gem',
    name: 'Void Gem',
    description: 'Rare premium currency earned from achievements and seasons.',
    currencyType: 'void_gem',
    iconPath: 'assets/currencies/void_gem.png',
    rarity: 'epic',
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Stamina spent to enter campaign stages and events.',
    currencyType: 'energy',
    iconPath: 'assets/currencies/energy.png',
    rarity: 'common',
  },
  {
    id: 'arena_coin',
    name: 'Arena Coin',
    description: 'Earned from Resonance Arena matches and season rewards.',
    currencyType: 'arena_coin',
    iconPath: 'assets/currencies/arena_coin.png',
    rarity: 'uncommon',
  },
  {
    id: 'covenant_coin',
    name: 'Sect Coin',
    description: 'Sect contribution currency for the weekly shop.',
    currencyType: 'covenant_coin',
    iconPath: 'assets/currencies/covenant_coin.png',
    rarity: 'uncommon',
  },
  {
    id: 'friendship_point',
    name: 'Friendship Point',
    description: 'Shared bond currency from friend gifts and exchanges.',
    currencyType: 'friendship_point',
    iconPath: 'assets/currencies/friendship_point.png',
    rarity: 'common',
  },
];

const CATEGORY_TYPE_LABELS: Record<ItemCategory, string> = {
  currency: 'Currency',
  enhancement: 'Enhancement',
  sigil: 'Sigil',
  material: 'Material',
  shard: 'Shard',
  special: 'Special',
};

export class InventoryScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.INVENTORY;

  private backButton: ButtonPrimary | null = null;
  private categoryTabs: InventoryCategoryTabs | null = null;
  private itemGrid: InventoryItemGrid | null = null;
  private detailPanel: InventoryDetailPanel | null = null;
  private activeTab: InventoryTabId = 'currency';

  constructor() {
    super({ key: InventoryScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'INVENTORY', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.categoryTabs = new InventoryCategoryTabs(
      this,
      40,
      72,
      this.activeTab,
      (tabId) => this.onTabChanged(tabId),
    );

    this.itemGrid = new InventoryItemGrid(this, 48, 108, (entry) => {
      this.detailPanel?.showEntry(entry);
    });

    this.detailPanel = new InventoryDetailPanel(this, 660, 210, 280, 240);

    this.refreshGrid();
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.categoryTabs?.destroy();
    this.itemGrid?.destroy();
    this.detailPanel?.destroy();

    this.backButton = null;
    this.categoryTabs = null;
    this.itemGrid = null;
    this.detailPanel = null;
  }

  private onTabChanged(tabId: InventoryTabId): void {
    this.activeTab = tabId;
    this.detailPanel?.clear();
    this.refreshGrid();
  }

  private refreshGrid(): void {
    const save = this.loadSave();
    if (!save || !this.itemGrid) return;

    const entries = this.buildEntriesForTab(save, this.activeTab);
    this.itemGrid.setEntries(entries, { showZeroQuantity: this.activeTab === 'currency' });

    if (entries.length > 0 && entries.some((entry) => entry.quantity > 0)) {
      const firstOwned = entries.find((entry) => entry.quantity > 0);
      if (firstOwned) {
        this.detailPanel?.showEntry(firstOwned);
      }
    }
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
  }

  private buildEntriesForTab(save: RealmSaveDataV3, tabId: InventoryTabId): InventoryDisplayEntry[] {
    if (tabId === 'currency') {
      return CURRENCY_DISPLAY.map((currency) => ({
        id: currency.id,
        name: currency.name,
        description: currency.description,
        quantity: EconomySystem.getCurrencyBalance(save, currency.currencyType),
        rarity: currency.rarity,
        iconPath: currency.iconPath,
        typeLabel: 'Currency',
      }));
    }

    if (tabId === 'shard') {
      return [
        ...this.buildItemCategoryEntries(save, 'shard'),
        ...this.buildHeroShardEntries(save),
      ];
    }

    return this.buildItemCategoryEntries(save, tabId);
  }

  private buildItemCategoryEntries(
    save: RealmSaveDataV3,
    category: ItemCategory,
  ): InventoryDisplayEntry[] {
    return getItemsByCategory(category).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: InventorySystem.getQuantity(save, item.id),
      rarity: item.rarity,
      iconPath: item.iconPath,
      consumable: item.consumable,
      typeLabel: CATEGORY_TYPE_LABELS[item.category],
    }));
  }

  private buildHeroShardEntries(save: RealmSaveDataV3): InventoryDisplayEntry[] {
    return Object.entries(save.inventory.heroShards)
      .filter(([, quantity]) => quantity > 0)
      .map(([heroId, quantity]) => {
        const hero = HEROES_DATA.find((entry) => entry.id === heroId);
        return {
          id: `hero_shard_${heroId}`,
          name: `${hero?.name ?? heroId} Shards`,
          description: 'Fragments used to ascend this Relic Bearer.',
          quantity,
          rarity: (hero?.rarity ?? 'rare') as ItemRarity,
          typeLabel: 'Hero Shard',
        };
      });
  }
}
