// src/ui/InventoryItemGrid.ts
// Scrollable-style item grid for InventoryScene.

import Phaser from 'phaser';
import type { ItemRarity } from '../data/items';
import { ItemIcon } from './ItemIcon';
import type { InventoryDisplayEntry } from './InventoryDetailPanel';

const RARITY_COLORS: Record<ItemRarity, number> = {
  common: 0x888888,
  uncommon: 0x44cc66,
  rare: 0x4488ff,
  epic: 0xaa44ff,
  legendary: 0xffaa22,
};

const SLOT_SIZE = 64;
const SLOT_GAP = 10;
const COLUMNS = 3;

interface GridSlotUi {
  bg: Phaser.GameObjects.Rectangle;
  icon: ItemIcon;
  qtyLabel: Phaser.GameObjects.Text;
  nameLabel: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  entry: InventoryDisplayEntry;
}

export class InventoryItemGrid {
  private readonly originX: number;
  private readonly originY: number;
  private readonly emptyLabel: Phaser.GameObjects.Text;
  private readonly slots: GridSlotUi[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    originX: number,
    originY: number,
    private readonly onSelect: (entry: InventoryDisplayEntry) => void,
  ) {
    this.originX = originX;
    this.originY = originY;

    this.emptyLabel = scene.add.text(originX + 150, originY + 80, 'No items in this category', {
      fontSize: '12px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);
  }

  setEntries(entries: InventoryDisplayEntry[], options?: { showZeroQuantity?: boolean }): void {
    this.clearSlots();

    const visible = options?.showZeroQuantity
      ? entries
      : entries.filter((entry) => entry.quantity > 0);
    if (visible.length === 0) {
      this.emptyLabel.setVisible(true);
      return;
    }

    this.emptyLabel.setVisible(false);

    visible.forEach((entry, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = this.originX + col * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const y = this.originY + row * (SLOT_SIZE + 28) + SLOT_SIZE / 2;

      const bg = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0x1a1a2e)
        .setStrokeStyle(1, 0x333355);

      const icon = new ItemIcon(this.scene, x, y - 4, 40, {
        iconPath: entry.iconPath,
        label: entry.name,
        color: RARITY_COLORS[entry.rarity],
      });

      const qtyLabel = this.scene.add.text(x + SLOT_SIZE / 2 - 6, y + SLOT_SIZE / 2 - 6, String(entry.quantity), {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      }).setOrigin(1, 1);

      const nameLabel = this.scene.add.text(x, y + SLOT_SIZE / 2 + 10, entry.name, {
        fontSize: '8px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: SLOT_SIZE + 8 },
      }).setOrigin(0.5, 0);

      const zone = this.scene.add.zone(x, y, SLOT_SIZE, SLOT_SIZE + 20);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.onSelect(entry));

      this.slots.push({ bg, icon, qtyLabel, nameLabel, zone, entry });
    });
  }

  destroy(): void {
    this.clearSlots();
    this.emptyLabel.destroy();
  }

  private clearSlots(): void {
    for (const slot of this.slots) {
      slot.zone.removeAllListeners();
      slot.zone.destroy();
      slot.bg.destroy();
      slot.icon.destroy();
      slot.qtyLabel.destroy();
      slot.nameLabel.destroy();
    }
    this.slots.length = 0;
  }
}
