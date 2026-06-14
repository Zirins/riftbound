// src/ui/HeroSigilSlotRow.ts
// Two Sigil slot buttons on HeroDetailScene overview tab.

import Phaser from 'phaser';
import { SIGIL } from '../constants/gameConfig';
import { getSigilDefinition } from '../data/sigils';
import { SigilSystem } from '../systems/SigilSystem';
import type { RealmSaveDataV3 } from '../types';

const SLOT_SIZE = 56;
const SLOT_GAP = 12;

interface SlotUi {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  subLabel: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class HeroSigilSlotRow {
  private readonly titleLabel: Phaser.GameObjects.Text;
  private readonly slots: SlotUi[] = [];
  private readonly slotInstanceIds: (string | null)[] = [];

  constructor(
    scene: Phaser.Scene,
    originX: number,
    originY: number,
    private readonly onSlotTap: (slotIndex: 0 | 1, instanceId: string | null) => void,
  ) {
    this.titleLabel = scene.add.text(originX, originY, 'SIGILS', {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    for (let slotIndex = 0; slotIndex < SIGIL.SLOTS_PER_HERO_V2; slotIndex += 1) {
      const x = originX + slotIndex * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const y = originY + 38;
      const bg = scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0x1a1a2e)
        .setStrokeStyle(1, 0x444466);
      const label = scene.add.text(x, y, `S${slotIndex}`, {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      const subLabel = scene.add.text(x, y + SLOT_SIZE / 2 + 6, 'Empty', {
        fontSize: '7px',
        color: '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const zone = scene.add.zone(x, y, SLOT_SIZE, SLOT_SIZE + 14);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        this.onSlotTap(slotIndex as 0 | 1, this.slotInstanceIds[slotIndex] ?? null);
      });

      this.slots.push({ bg, label, subLabel, zone });
      this.slotInstanceIds.push(null);
    }
  }

  refresh(save: RealmSaveDataV3, heroId: string): void {
    for (let slotIndex = 0; slotIndex < SIGIL.SLOTS_PER_HERO_V2; slotIndex += 1) {
      const slotUi = this.slots[slotIndex];
      const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
      const instanceId = hero?.equippedSigilIds[slotIndex] || null;
      const owned = instanceId ? SigilSystem.findOwnedSigil(save, instanceId) : null;
      const definition = owned ? getSigilDefinition(owned.definitionId) : null;

      this.slotInstanceIds[slotIndex] = instanceId;

      if (owned && definition) {
        slotUi.label.setText(`Lv${owned.level}`);
        slotUi.label.setColor('#ffffff');
        slotUi.subLabel.setText(definition.name);
        slotUi.bg.setStrokeStyle(1, 0x6688aa);
      } else {
        slotUi.label.setText(`S${slotIndex}`);
        slotUi.label.setColor('#aaaaaa');
        slotUi.subLabel.setText('Empty');
        slotUi.bg.setStrokeStyle(1, 0x444466);
      }
    }
  }

  destroy(): void {
    this.titleLabel.destroy();
    for (const slot of this.slots) {
      slot.zone.removeAllListeners();
      slot.zone.destroy();
      slot.bg.destroy();
      slot.label.destroy();
      slot.subLabel.destroy();
    }
    this.slots.length = 0;
  }
}
