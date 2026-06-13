// src/ui/InventoryDetailPanel.ts
// Item detail side panel for InventoryScene.

import Phaser from 'phaser';
import type { ItemRarity } from '../data/items';
import { ItemIcon } from './ItemIcon';

const RARITY_COLORS: Record<ItemRarity, number> = {
  common: 0x888888,
  uncommon: 0x44cc66,
  rare: 0x4488ff,
  epic: 0xaa44ff,
  legendary: 0xffaa22,
};

export interface InventoryDisplayEntry {
  id: string;
  name: string;
  description: string;
  quantity: number;
  rarity: ItemRarity;
  iconPath?: string;
  consumable?: boolean;
  typeLabel?: string;
}

export class InventoryDetailPanel {
  private readonly panelBg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly typeLabel: Phaser.GameObjects.Text;
  private readonly quantityLabel: Phaser.GameObjects.Text;
  private readonly description: Phaser.GameObjects.Text;
  private readonly placeholder: Phaser.GameObjects.Text;
  private icon: ItemIcon | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.panelBg = scene.add.rectangle(x, y, width, height, 0x1a1a2e)
      .setStrokeStyle(1, 0x444466);

    this.placeholder = scene.add.text(x, y, 'Select an item to view details', {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5);

    this.title = scene.add.text(x - width / 2 + 16, y - height / 2 + 16, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: width - 32 },
    }).setOrigin(0, 0).setVisible(false);

    this.typeLabel = scene.add.text(x - width / 2 + 16, y - height / 2 + 40, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0, 0).setVisible(false);

    this.quantityLabel = scene.add.text(x - width / 2 + 16, y - height / 2 + 58, '', {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    }).setOrigin(0, 0).setVisible(false);

    this.description = scene.add.text(x - width / 2 + 16, y - height / 2 + 120, '', {
      fontSize: '10px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      wordWrap: { width: width - 32 },
    }).setOrigin(0, 0).setVisible(false);
  }

  showEntry(entry: InventoryDisplayEntry): void {
    this.clearIcon();
    this.placeholder.setVisible(false);

    this.icon = new ItemIcon(
      this.scene,
      this.panelBg.x,
      this.panelBg.y - 40,
      56,
      {
        iconPath: entry.iconPath,
        label: entry.name,
        color: RARITY_COLORS[entry.rarity],
      },
    );

    this.title.setText(entry.name).setVisible(true);
    this.typeLabel.setText(
      `${entry.typeLabel ?? 'Item'} · ${entry.rarity.toUpperCase()}${entry.consumable ? ' · Consumable' : ''}`,
    ).setVisible(true);
    this.quantityLabel.setText(`Owned: ${entry.quantity.toLocaleString()}`).setVisible(true);
    this.description.setText(entry.description).setVisible(true);
  }

  clear(): void {
    this.clearIcon();
    this.title.setVisible(false);
    this.typeLabel.setVisible(false);
    this.quantityLabel.setVisible(false);
    this.description.setVisible(false);
    this.placeholder.setVisible(true);
  }

  destroy(): void {
    this.clearIcon();
    this.panelBg.destroy();
    this.placeholder.destroy();
    this.title.destroy();
    this.typeLabel.destroy();
    this.quantityLabel.destroy();
    this.description.destroy();
  }

  private clearIcon(): void {
    this.icon?.destroy();
    this.icon = null;
  }
}
