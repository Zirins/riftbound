// src/ui/InventoryCategoryTabs.ts
// Category tab bar for InventoryScene.

import Phaser from 'phaser';
import type { ItemCategory } from '../data/items';

export type InventoryTabId = ItemCategory | 'currency';

export interface InventoryTabConfig {
  id: InventoryTabId;
  label: string;
}

export const INVENTORY_TABS: InventoryTabConfig[] = [
  { id: 'currency', label: 'Currencies' },
  { id: 'enhancement', label: 'Enhancement' },
  { id: 'sigil', label: 'Sigils' },
  { id: 'material', label: 'Materials' },
  { id: 'shard', label: 'Shards' },
  { id: 'special', label: 'Special' },
];

const TAB_WIDTH = 118;
const TAB_HEIGHT = 28;
const TAB_GAP = 6;

export class InventoryCategoryTabs {
  private readonly backgrounds: Phaser.GameObjects.Rectangle[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly zones: Phaser.GameObjects.Zone[] = [];
  private selectedId: InventoryTabId;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    y: number,
    initialTab: InventoryTabId,
    private readonly onChange: (tabId: InventoryTabId) => void,
  ) {
    this.selectedId = initialTab;

    INVENTORY_TABS.forEach((tab, index) => {
      const x = startX + index * (TAB_WIDTH + TAB_GAP) + TAB_WIDTH / 2;
      const bg = scene.add.rectangle(x, y, TAB_WIDTH, TAB_HEIGHT, 0x222233)
        .setStrokeStyle(1, 0x444466);
      const label = scene.add.text(x, y, tab.label, {
        fontSize: '9px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = scene.add.zone(x, y, TAB_WIDTH, TAB_HEIGHT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.selectTab(tab.id));

      this.backgrounds.push(bg);
      this.labels.push(label);
      this.zones.push(zone);
    });

    this.refreshStyles();
  }

  getSelectedTab(): InventoryTabId {
    return this.selectedId;
  }

  destroy(): void {
    for (const zone of this.zones) {
      zone.removeAllListeners();
      zone.destroy();
    }
    for (const bg of this.backgrounds) bg.destroy();
    for (const label of this.labels) label.destroy();
    this.backgrounds.length = 0;
    this.labels.length = 0;
    this.zones.length = 0;
  }

  private selectTab(tabId: InventoryTabId): void {
    if (this.selectedId === tabId) return;
    this.selectedId = tabId;
    this.refreshStyles();
    this.onChange(tabId);
  }

  private refreshStyles(): void {
    INVENTORY_TABS.forEach((tab, index) => {
      const selected = tab.id === this.selectedId;
      this.backgrounds[index].setFillStyle(selected ? 0x3355aa : 0x222233);
      this.labels[index].setColor(selected ? '#ffffff' : '#aaaaaa');
    });
  }
}
