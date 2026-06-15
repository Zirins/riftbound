// src/ui/RiftChronicleOverlay.ts
// 7-day login calendar overlay launched from Hub.

import Phaser from 'phaser';
import { CANVAS, RIFT_CHRONICLE_REWARDS } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import { loadCurrentRealm } from '../systems/SaveSystem';
import * as RiftChronicleSystem from '../systems/RiftChronicleSystem';
import { createOverlayDim } from './HubOverlayPanel';

const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 300;
const CELL_WIDTH = 88;
const CELL_HEIGHT = 72;
const CELL_GAP = 8;
const BUTTON_HEIGHT = 36;
const OVERLAY_DEPTH = 100;

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

function formatRewardSummary(
  entry: (typeof RIFT_CHRONICLE_REWARDS)[number],
): string {
  return entry.rewards.map((reward) => {
    switch (reward.type) {
      case 'gold':
        return `${reward.amount}G`;
      case 'crystals':
        return `${reward.amount}C`;
      case 'xpFragments':
        return `${reward.amount} XP`;
      case 'shards_rare_random':
        return `${reward.amount} Rare Shards`;
      case 'shards_hero': {
        const heroName = HEROES_DATA.find((hero) => hero.id === reward.heroId)?.name ?? reward.heroId;
        return `${reward.amount} ${heroName} Shards`;
      }
    }
  }).join(' + ');
}

export class RiftChronicleOverlay {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private readonly onClose: () => void;
  private readonly onRefresh: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void, onRefresh: () => void = () => {}) {
    this.scene = scene;
    this.onClose = onClose;
    this.onRefresh = onRefresh;
    this.render();
  }

  private render(): void {
    this.destroyContent();

    this.container = this.scene.add.container(0, 0).setDepth(OVERLAY_DEPTH);
    this.container.setSize(CANVAS.WIDTH, CANVAS.HEIGHT);

    const dim = createOverlayDim(this.scene);

    const panel = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      0x1a1a2e,
    );
    panel.setStrokeStyle(2, 0x44ccff);

    const title = this.scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 120, 'RIFT CHRONICLE', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.container.add([dim, panel, title]);
    this.drawCalendar();
    this.drawClaimArea();
    this.addContainerButton(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 130,
      'CLOSE',
      () => this.close(),
      100,
    );
  }

  private drawCalendar(): void {
    const realm = loadCurrentRealm();
    const streak = realm?.riftChronicle.currentStreak ?? 0;
    const available = RiftChronicleSystem.isAvailableToday();
    const nextIndex = streak % RIFT_CHRONICLE_REWARDS.length;
    const claimedThrough = available
      ? nextIndex
      : (nextIndex === 0 ? RIFT_CHRONICLE_REWARDS.length : nextIndex);
    const todayIndex = available ? nextIndex : -1;

    const totalWidth = RIFT_CHRONICLE_REWARDS.length * CELL_WIDTH
      + (RIFT_CHRONICLE_REWARDS.length - 1) * CELL_GAP;
    const startX = CANVAS.WIDTH / 2 - totalWidth / 2 + CELL_WIDTH / 2;
    const centerY = CANVAS.HEIGHT / 2 - 20;

    for (let i = 0; i < RIFT_CHRONICLE_REWARDS.length; i += 1) {
      const entry = RIFT_CHRONICLE_REWARDS[i];
      const x = startX + i * (CELL_WIDTH + CELL_GAP);
      const isClaimed = i < claimedThrough;
      const isToday = i === todayIndex;

      const fillColor = isToday ? 0x334466 : 0x222233;
      const cell = this.scene.add.rectangle(x, centerY, CELL_WIDTH, CELL_HEIGHT, fillColor);
      cell.setStrokeStyle(isToday ? 2 : 1, isToday ? 0xffcc44 : 0x445566);

      const dayLabel = this.scene.add.text(x, centerY - 22, `Day ${entry.day}`, {
        fontSize: '10px',
        color: isToday ? '#ffcc44' : '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const rewardLabel = this.scene.add.text(x, centerY + 4, formatRewardSummary(entry), {
        fontSize: '8px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: CELL_WIDTH - 8 },
      }).setOrigin(0.5);

      this.container?.add([cell, dayLabel, rewardLabel]);

      if (isClaimed) {
        const check = this.scene.add.text(x + CELL_WIDTH / 2 - 10, centerY - CELL_HEIGHT / 2 + 8, '✓', {
          fontSize: '12px',
          color: '#44ff88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.container?.add(check);
      }
    }
  }

  private drawClaimArea(): void {
    const available = RiftChronicleSystem.isAvailableToday();

    if (available) {
      this.addContainerButton(
        CANVAS.WIDTH / 2,
        CANVAS.HEIGHT / 2 + 90,
        'CLAIM TODAY\'S REWARD',
        () => {
          RiftChronicleSystem.claimToday();
          this.onRefresh();
          this.render();
        },
        220,
      );
      return;
    }

    const message = this.scene.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 90,
      'Come back tomorrow',
      {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.container?.add(message);
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

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private destroyContent(): void {
    for (const button of this.overlayButtons) button.zone.off('pointerup');
    this.overlayButtons.length = 0;
    this.container?.destroy(true);
    this.container = null;
  }

  destroy(): void {
    this.destroyContent();
  }
}
