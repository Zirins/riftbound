// src/ui/SigilDetailPanel.ts
// Selected Sigil detail + action buttons for SigilScene.

import Phaser from 'phaser';
import { getSigilDefinition, scalePrimaryStatValue } from '../data/sigils';
import { HEROES_DATA } from '../data/heroes';
import type { OwnedSigil } from '../types';
import { ButtonPrimary } from './ButtonPrimary';
import type { SigilGridEntry } from './SigilGrid';

export class SigilDetailPanel {
  private readonly titleLabel: Phaser.GameObjects.Text;
  private readonly bodyLabel: Phaser.GameObjects.Text;
  private equipButton: ButtonPrimary | null = null;
  private upgradeButton: ButtonPrimary | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly centerX: number,
    private readonly centerY: number,
    private readonly panelWidth: number,
    private readonly onEquip: () => void,
    private readonly onUpgrade: () => void,
  ) {
    this.titleLabel = scene.add.text(centerX, centerY - 90, 'Select a Sigil', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: panelWidth - 20 },
    }).setOrigin(0.5, 0);

    this.bodyLabel = scene.add.text(centerX, centerY - 58, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
      align: 'left',
      wordWrap: { width: panelWidth - 20 },
    }).setOrigin(0.5, 0);
  }

  showEntry(entry: SigilGridEntry | null, owned?: OwnedSigil | null): void {
    this.equipButton?.destroy();
    this.upgradeButton?.destroy();
    this.equipButton = null;
    this.upgradeButton = null;

    if (!entry || !owned) {
      this.titleLabel.setText('Select a Sigil');
      this.bodyLabel.setText('Tap a Sigil from the grid to preview stats and equip.');
      return;
    }

    const definition = getSigilDefinition(owned.definitionId);
    if (!definition) {
      this.titleLabel.setText(entry.name);
      this.bodyLabel.setText('Unknown Sigil definition.');
      return;
    }

    const primaryValue = scalePrimaryStatValue(definition.primaryStat.value, owned.level);
    const equippedText = owned.equippedHeroId
      ? HEROES_DATA.find((hero) => hero.id === owned.equippedHeroId)?.name ?? owned.equippedHeroId
      : null;

    const lines = [
      `${definition.rarity.toUpperCase()} · ${definition.element}`,
      `Primary: ${definition.primaryStat.statType} +${primaryValue}`,
      `Level ${owned.level} / 10 · BT ${owned.breakthroughLevel}/3`,
      owned.secondaryStats.length > 0
        ? `Secondary: ${owned.secondaryStats.map((roll) => `${roll.statType}+${roll.value}`).join(', ')}`
        : 'Secondary: none',
      equippedText ? `Equipped on ${equippedText}` : 'Unequipped',
    ];

    this.titleLabel.setText(entry.name);
    this.bodyLabel.setText(lines.join('\n'));

    this.equipButton = new ButtonPrimary(
      this.scene,
      this.centerX,
      this.centerY + 52,
      'EQUIP',
      this.onEquip,
      this.panelWidth - 24,
      36,
    );

    this.upgradeButton = new ButtonPrimary(
      this.scene,
      this.centerX,
      this.centerY + 96,
      'UPGRADE',
      this.onUpgrade,
      this.panelWidth - 24,
      36,
    );
  }

  destroy(): void {
    this.equipButton?.destroy();
    this.upgradeButton?.destroy();
    this.titleLabel.destroy();
    this.bodyLabel.destroy();
    this.equipButton = null;
    this.upgradeButton = null;
  }
}
