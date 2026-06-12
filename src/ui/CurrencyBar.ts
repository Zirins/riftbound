// src/ui/CurrencyBar.ts
// Top HUD: Gold, Rift Crystals, Energy from current realm save.

import Phaser from 'phaser';
import { ENERGY } from '../constants/gameConfig';
import { loadCurrentRealm } from '../systems/SaveSystem';

const GOLD_COLOR = 0xffcc00;
const CRYSTAL_COLOR = 0x44aaff;

export class CurrencyBar {
  private readonly goldIcon: Phaser.GameObjects.Arc;
  private readonly goldLabel: Phaser.GameObjects.Text;
  private readonly crystalIcon: Phaser.GameObjects.Arc;
  private readonly crystalLabel: Phaser.GameObjects.Text;
  private readonly energyLabel: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    y: number,
  ) {
    this.goldIcon = scene.add.circle(startX, y, 6, GOLD_COLOR);
    this.goldLabel = scene.add.text(startX + 14, y, '', {
      fontSize: '12px',
      color: '#ffcc00',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.crystalIcon = scene.add.circle(startX + 120, y, 6, CRYSTAL_COLOR);
    this.crystalLabel = scene.add.text(startX + 134, y, '', {
      fontSize: '12px',
      color: '#44aaff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.energyLabel = scene.add.text(startX + 250, y, '', {
      fontSize: '12px',
      color: '#88ff88',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.updateValues();
  }

  updateValues(): void {
    const realm = loadCurrentRealm();
    const gold = realm?.inventory.gold ?? 0;
    const crystals = realm?.inventory.riftCrystals ?? 0;
    const energy = realm?.inventory.energy ?? 0;
    const maxEnergy = realm?.inventory.maxEnergy ?? ENERGY.MAX;

    this.goldLabel.setText(String(gold));
    this.crystalLabel.setText(String(crystals));
    this.energyLabel.setText(`⚡ ${energy}/${maxEnergy}`);
  }

  destroy(): void {
    this.goldIcon.destroy();
    this.goldLabel.destroy();
    this.crystalIcon.destroy();
    this.crystalLabel.destroy();
    this.energyLabel.destroy();
  }
}
