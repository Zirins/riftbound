// src/ui/ProgressBar.ts
// Generic horizontal fill bar for XP and similar meters.

import Phaser from 'phaser';

export class ProgressBar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly width: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    bgColor: number,
  ) {
    this.width = width;
    this.bg = scene.add.rectangle(x, y, width, height, bgColor).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(x, y, 0, height, fillColor).setOrigin(0, 0.5);
  }

  setProgress(ratio: number): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    this.fill.width = this.width * clamped;
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
  }
}
