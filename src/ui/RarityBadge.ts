// src/ui/RarityBadge.ts
// Colored border frame mapping HeroRarity to tier colors.

import Phaser from 'phaser';
import type { HeroRarity } from '../types';

const RARITY_COLORS: Record<HeroRarity, number> = {
  uncommon: 0x888888,
  rare: 0x4488ff,
  epic: 0xaa44ff,
  legendary: 0xffcc22,
};

export class RarityBadge {
  private readonly border: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    rarity: HeroRarity,
  ) {
    this.border = scene.add.rectangle(x, y, width, height);
    this.border.setStrokeStyle(2, RARITY_COLORS[rarity]);
    this.border.setFillStyle(0x000000, 0);
  }

  reparentTo(container: Phaser.GameObjects.Container): void {
    container.add(this.border);
  }

  setRarity(rarity: HeroRarity): void {
    this.border.setStrokeStyle(2, RARITY_COLORS[rarity]);
  }

  destroy(): void {
    this.border.destroy();
  }
}
