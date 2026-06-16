// src/ui/NotificationDot.ts
// Red notification badge with optional count.

import Phaser from 'phaser';

const DOT_COLOR = 0xff2222;
const DOT_RADIUS = 8;

export class NotificationDot {
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly countLabel: Phaser.GameObjects.Text;
  private visible = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.circle = scene.add.circle(x, y, DOT_RADIUS, DOT_COLOR);
    this.circle.setVisible(false);

    this.countLabel = scene.add.text(x, y, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.countLabel.setVisible(false);
  }

  show(count?: number): void {
    this.visible = true;
    this.circle.setVisible(true);

    if (count !== undefined && count > 0) {
      this.countLabel.setText(String(count));
      this.countLabel.setVisible(true);
    } else {
      this.countLabel.setVisible(false);
    }
  }

  hide(): void {
    this.visible = false;
    this.circle.setVisible(false);
    this.countLabel.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  setDepth(depth: number): void {
    this.circle.setDepth(depth);
    this.countLabel.setDepth(depth);
  }

  destroy(): void {
    this.circle.destroy();
    this.countLabel.destroy();
  }
}
