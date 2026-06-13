// src/ui/HeroCard.ts
// Roster hero tile — owned portrait or unowned silhouette.

import Phaser from 'phaser';
import type { HeroData, HeroOwnershipState } from '../types';
import { RarityBadge } from './RarityBadge';
import { StarRating } from './StarRating';

export const HERO_CARD_WIDTH = 88;
export const HERO_CARD_HEIGHT = 128;

const SILHOUETTE_COLOR = 0x333344;
const CLASS_LABELS: Record<HeroData['heroClass'], string> = {
  tank: 'Tank',
  fighter: 'Fighter',
  assassin: 'Assassin',
  mage: 'Mage',
  support: 'Support',
  ranger: 'Ranger',
};

export class HeroCard {
  private readonly badge: RarityBadge;
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly rpLabel: Phaser.GameObjects.Text;
  private readonly classLabel: Phaser.GameObjects.Text;
  private readonly unknownLabel: Phaser.GameObjects.Text | null;
  private readonly starRating: StarRating | null;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly onTap: () => void;
  private readonly tapGuard?: () => boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    ownershipState: HeroOwnershipState | null,
    rp: number,
    onTap: () => void,
    tapGuard?: () => boolean,
  ) {
    this.onTap = onTap;
    this.tapGuard = tapGuard;
    const owned = ownershipState?.isOwned ?? false;

    this.badge = new RarityBadge(
      scene,
      x,
      y,
      HERO_CARD_WIDTH,
      HERO_CARD_HEIGHT,
      heroData.rarity,
    );

    this.circle = scene.add.circle(
      x,
      y - 28,
      heroData.radius * 0.65,
      owned ? heroData.color : SILHOUETTE_COLOR,
    );

    this.unknownLabel = owned
      ? null
      : scene.add.text(x, y - 28, '?', {
          fontSize: '18px',
          color: '#888899',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

    this.nameLabel = scene.add.text(x, y + 2, owned ? heroData.name : '???', {
      fontSize: '10px',
      color: owned ? '#ffffff' : '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.rpLabel = scene.add.text(x, y + 18, owned ? `RP ${rp.toLocaleString()}` : '—', {
      fontSize: '9px',
      color: owned ? '#aaaacc' : '#666677',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.starRating = owned
      ? new StarRating(scene, x - 28, y + 34, ownershipState!.starRank)
      : null;

    this.classLabel = scene.add.text(x, y + 50, CLASS_LABELS[heroData.heroClass], {
      fontSize: '8px',
      color: '#7788aa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.zone = scene.add.zone(x, y, HERO_CARD_WIDTH, HERO_CARD_HEIGHT);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', this.handlePointerUp, this);
  }

  destroy(): void {
    this.zone.off('pointerup', this.handlePointerUp, this);
    this.zone.destroy();
    this.badge.destroy();
    this.circle.destroy();
    this.nameLabel.destroy();
    this.rpLabel.destroy();
    this.classLabel.destroy();
    this.unknownLabel?.destroy();
    this.starRating?.destroy();
  }

  private readonly handlePointerUp = (): void => {
    if (this.tapGuard?.()) return;
    this.onTap();
  };

  reparentTo(container: Phaser.GameObjects.Container): void {
    this.badge.reparentTo(container);
    container.add(this.circle);
    if (this.unknownLabel) container.add(this.unknownLabel);
    container.add(this.nameLabel);
    container.add(this.rpLabel);
    container.add(this.classLabel);
    this.starRating?.reparentTo(container);
    container.add(this.zone);
  }
}
