// src/ui/WorldFeedWidget.ts
// Hub world activity ticker — cycles deterministic daily feed messages.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { WorldFeedSystem } from '../systems/WorldFeedSystem';

const TICKER_Y = 98;
const CYCLE_MS = 4_500;
const LABEL_PREFIX = '◆ WORLD FEED: ';

export class WorldFeedWidget {
  /** Active instance count — used by dev harness to verify Hub re-entry cleanup. */
  static activeInstanceCount = 0;

  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private cycleTimer: Phaser.Time.TimerEvent | null = null;
  private messages: string[] = [];
  private messageIndex = 0;

  constructor(scene: Phaser.Scene, dateKey?: string) {
    this.scene = scene;
    WorldFeedWidget.activeInstanceCount += 1;
    this.messages = WorldFeedSystem.generateFeed(dateKey ?? WorldFeedSystem.getDateKey());
    this.build();
    this.startCycle();
  }

  private build(): void {
    this.container = this.scene.add.container(0, 0).setDepth(50);

    const bar = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      TICKER_Y,
      CANVAS.WIDTH - 32,
      22,
      0x12121f,
      0.85,
    );
    bar.setStrokeStyle(1, 0x334466);

    const initialMessage = this.messages[0] ?? 'The Rift stirs across the realm…';
    this.messageText = this.scene.add.text(24, TICKER_Y, `${LABEL_PREFIX}${initialMessage}`, {
      fontSize: '10px',
      color: '#88aacc',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.container.add([bar, this.messageText]);
  }

  private startCycle(): void {
    if (this.messages.length <= 1) return;

    this.cycleTimer = this.scene.time.addEvent({
      delay: CYCLE_MS,
      loop: true,
      callback: () => this.showNextMessage(),
    });
  }

  private showNextMessage(): void {
    if (!this.messageText || this.messages.length === 0) return;

    this.messageIndex = (this.messageIndex + 1) % this.messages.length;
    this.messageText.setText(`${LABEL_PREFIX}${this.messages[this.messageIndex]}`);
  }

  destroy(): void {
    this.cycleTimer?.remove();
    this.cycleTimer = null;
    this.container?.destroy(true);
    this.container = null;
    this.messageText = null;
    WorldFeedWidget.activeInstanceCount = Math.max(0, WorldFeedWidget.activeInstanceCount - 1);
  }
}
