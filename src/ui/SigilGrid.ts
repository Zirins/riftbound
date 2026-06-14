// src/ui/SigilGrid.ts
// Owned Sigil grid for SigilScene.

import Phaser from 'phaser';
import type { ElementType, EquipmentSigilRarity, SigilStatType } from '../types';

const RARITY_COLORS: Record<EquipmentSigilRarity, number> = {
  common: 0x888888,
  uncommon: 0x44cc66,
  rare: 0x4488ff,
  epic: 0xaa44ff,
  legendary: 0xffaa22,
};

const ELEMENT_COLORS: Record<ElementType, number> = {
  iron: 0x8899aa,
  flame: 0xff6633,
  storm: 0x66aaff,
  frost: 0x88ddff,
  stone: 0x998866,
  void: 0x8844cc,
  light: 0xffee88,
  blood: 0xcc3344,
  time: 0xbb88ff,
  venom: 0x66cc44,
  lunar: 0xccccee,
};

export interface SigilGridEntry {
  instanceId: string;
  name: string;
  rarity: EquipmentSigilRarity;
  element: ElementType;
  primaryStat: SigilStatType;
  level: number;
  equippedHeroId?: string;
}

const SLOT_SIZE = 68;
const SLOT_GAP = 8;
const COLUMNS = 4;

interface GridSlotUi {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Arc;
  levelLabel: Phaser.GameObjects.Text;
  nameLabel: Phaser.GameObjects.Text;
  badgeLabel: Phaser.GameObjects.Text | null;
  zone: Phaser.GameObjects.Zone;
  entry: SigilGridEntry;
}

export class SigilGrid {
  private readonly emptyLabel: Phaser.GameObjects.Text;
  private readonly slots: GridSlotUi[] = [];
  private selectedId: string | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly originX: number,
    private readonly originY: number,
    private readonly onSelect: (entry: SigilGridEntry) => void,
  ) {
    this.emptyLabel = scene.add.text(originX + 150, originY + 80, 'No Sigils match filters', {
      fontSize: '12px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);
  }

  setEntries(entries: SigilGridEntry[], selectedId?: string | null): void {
    this.clearSlots();
    this.selectedId = selectedId ?? null;

    if (entries.length === 0) {
      this.emptyLabel.setVisible(true);
      return;
    }

    this.emptyLabel.setVisible(false);

    entries.forEach((entry, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = this.originX + col * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const y = this.originY + row * (SLOT_SIZE + 24) + SLOT_SIZE / 2;
      const isSelected = entry.instanceId === this.selectedId;
      const color = ELEMENT_COLORS[entry.element] ?? RARITY_COLORS[entry.rarity];

      const bg = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0x1a1a2e)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffcc44 : 0x333355);

      const icon = this.scene.add.circle(x, y - 4, 18, color);

      const levelLabel = this.scene.add.text(x, y - 2, `Lv${entry.level}`, {
        fontSize: '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#000000aa',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5);

      const nameLabel = this.scene.add.text(x, y + SLOT_SIZE / 2 + 6, entry.name, {
        fontSize: '7px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: SLOT_SIZE + 6 },
      }).setOrigin(0.5, 0);

      let badgeLabel: Phaser.GameObjects.Text | null = null;
      if (entry.equippedHeroId) {
        badgeLabel = this.scene.add.text(x + SLOT_SIZE / 2 - 4, y - SLOT_SIZE / 2 + 4, 'E', {
          fontSize: '8px',
          color: '#ffffff',
          fontFamily: 'monospace',
          backgroundColor: '#3355aa',
          padding: { x: 2, y: 1 },
        }).setOrigin(1, 0);
      }

      const zone = this.scene.add.zone(x, y, SLOT_SIZE, SLOT_SIZE + 18);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        this.selectedId = entry.instanceId;
        this.onSelect(entry);
      });

      this.slots.push({
        bg,
        icon,
        levelLabel,
        nameLabel,
        badgeLabel,
        zone,
        entry,
      });
    });
  }

  getSelectedId(): string | null {
    return this.selectedId;
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
      slot.levelLabel.destroy();
      slot.nameLabel.destroy();
      slot.badgeLabel?.destroy();
    }
    this.slots.length = 0;
  }
}
