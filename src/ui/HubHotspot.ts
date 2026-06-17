// src/ui/HubHotspot.ts
// Tappable world-map landmark on the scrollable hub background.

import Phaser from 'phaser';
import type { SceneKey } from '../constants/sceneKeys';
import {
  getUnlockMessage,
  isUnlocked,
  type FeatureKey,
} from '../systems/FeatureUnlockSystem';

export const HUB_HOTSPOT_WIDTH = 120;
export const HUB_HOTSPOT_HEIGHT = 160;

export interface HubHotspotConfig {
  label: string;
  worldX: number;
  featureKey: FeatureKey;
  sceneKey: SceneKey;
}

export class HubHotspot {
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly label: Phaser.GameObjects.Text;
  private readonly lockOverlay: Phaser.GameObjects.Rectangle | null;
  private readonly lockIcon: Phaser.GameObjects.Text | null;
  private readonly config: HubHotspotConfig;
  private readonly onNavigate: (sceneKey: SceneKey) => void;
  private readonly onLocked: (message: string) => void;

  constructor(
    scene: Phaser.Scene,
    config: HubHotspotConfig,
    worldY: number,
    onNavigate: (sceneKey: SceneKey) => void,
    onLocked: (message: string) => void,
  ) {
    this.config = config;
    this.onNavigate = onNavigate;
    this.onLocked = onLocked;

    const locked = !isUnlocked(config.featureKey);

    this.zone = scene.add.zone(config.worldX, worldY, HUB_HOTSPOT_WIDTH, HUB_HOTSPOT_HEIGHT);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', this.handleTap, this);

    this.label = scene.add.text(
      config.worldX,
      worldY + HUB_HOTSPOT_HEIGHT / 2 + 10,
      config.label,
      {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: HUB_HOTSPOT_WIDTH + 20 },
        stroke: '#000000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 0);

    if (locked) {
      this.lockOverlay = scene.add.rectangle(
        config.worldX,
        worldY,
        HUB_HOTSPOT_WIDTH,
        HUB_HOTSPOT_HEIGHT,
        0x333344,
        0.55,
      );
      this.lockIcon = scene.add.text(config.worldX, worldY, '🔒', {
        fontSize: '22px',
      }).setOrigin(0.5);
    } else {
      this.lockOverlay = null;
      this.lockIcon = null;
    }
  }

  setDepth(depth: number): void {
    this.zone.setDepth(depth);
    this.label.setDepth(depth);
    this.lockOverlay?.setDepth(depth + 1);
    this.lockIcon?.setDepth(depth + 2);
  }

  destroy(): void {
    this.zone.off('pointerup', this.handleTap, this);
    this.zone.destroy();
    this.label.destroy();
    this.lockOverlay?.destroy();
    this.lockIcon?.destroy();
  }

  private readonly handleTap = (): void => {
    if (!isUnlocked(this.config.featureKey)) {
      this.onLocked(getUnlockMessage(this.config.featureKey));
      return;
    }
    this.onNavigate(this.config.sceneKey);
  };
}
