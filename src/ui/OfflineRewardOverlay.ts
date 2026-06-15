// src/ui/OfflineRewardOverlay.ts
// Welcome-back offline reward claim overlay on Hub load (Section 22).

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { OfflineRewardSystem } from '../systems/OfflineRewardSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 260;
const BUTTON_HEIGHT = 36;
const OVERLAY_DEPTH = 100;

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class OfflineRewardOverlay {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private readonly rewardTexts: Phaser.GameObjects.Text[] = [];
  private readonly onClose: () => void;
  private readonly onRefresh: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void, onRefresh: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.onRefresh = onRefresh;
    this.render();
  }

  private render(): void {
    this.destroyContent();

    const realm = loadCurrentRealm();
    if (!realm) {
      this.onClose();
      return;
    }

    const save = realm as RealmSaveDataV3;
    const preview = OfflineRewardSystem.preview(save);
    const { pendingGold, pendingXpFragments, pendingEnergy } = save.offlineRewardState;

    this.container = this.scene.add.container(0, 0).setDepth(OVERLAY_DEPTH);
    this.container.setSize(CANVAS.WIDTH, CANVAS.HEIGHT);

    const dim = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HEIGHT,
      0x000000,
      0.8,
    );

    const panel = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      0x1a1a2e,
    );
    panel.setStrokeStyle(2, 0x44cc88);

    const title = this.scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 100, 'WELCOME BACK', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 76,
      `Away for ${preview.hoursCredited.toFixed(1)}h — rewards accrued`,
      {
        fontSize: '11px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.container.add([dim, panel, title, subtitle]);

    const rewardLines: string[] = [];
    if (pendingGold > 0) rewardLines.push(`Gold: ${pendingGold.toLocaleString()}`);
    if (pendingXpFragments > 0) rewardLines.push(`XP Fragments: ${pendingXpFragments}`);
    if (pendingEnergy > 0) rewardLines.push(`Energy: ${pendingEnergy}`);

    rewardLines.forEach((line, index) => {
      const text = this.scene.add.text(
        CANVAS.WIDTH / 2,
        CANVAS.HEIGHT / 2 - 40 + index * 22,
        line,
        {
          fontSize: '13px',
          color: '#ffffff',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5);
      this.rewardTexts.push(text);
      this.container?.add(text);
    });

    this.addContainerButton(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 90,
      'CLAIM',
      () => this.handleClaim(),
      140,
    );
  }

  private addContainerButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 80,
  ): void {
    if (!this.container) return;

    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, 0x3355aa);
    const text = this.scene.add.text(x, y, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, width, BUTTON_HEIGHT);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    this.container.add([bg, text, zone]);
    this.overlayButtons.push({ bg, label: text, zone });
  }

  private handleClaim(): void {
    const realm = loadCurrentRealm();
    if (!realm) {
      this.close();
      return;
    }

    const save = realm as RealmSaveDataV3;
    const result = OfflineRewardSystem.claim(save);
    if (!result.success) return;

    saveCurrentRealm(save);
    this.onRefresh();
    this.close();
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  destroy(): void {
    this.destroyContent();
  }

  private destroyContent(): void {
    for (const button of this.overlayButtons) {
      button.zone.destroy();
      button.bg.destroy();
      button.label.destroy();
    }
    this.overlayButtons.length = 0;

    for (const text of this.rewardTexts) text.destroy();
    this.rewardTexts.length = 0;

    this.container?.destroy();
    this.container = null;
  }
}
