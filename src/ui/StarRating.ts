// src/ui/StarRating.ts
// Renders 5 star symbols — filled or empty for counts 1–5.

import Phaser from 'phaser';

const STAR_SPACING = 14;

export class StarRating {
  private readonly stars: Phaser.GameObjects.Text[] = [];
  private currentStars = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stars: number,
  ) {
    for (let i = 0; i < 5; i++) {
      const star = scene.add.text(x + i * STAR_SPACING, y, '☆', {
        fontSize: '12px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.stars.push(star);
    }
    this.update(stars);
  }

  reparentTo(container: Phaser.GameObjects.Container): void {
    for (const star of this.stars) {
      container.add(star);
    }
  }

  update(stars: number): void {
    this.currentStars = Math.max(0, Math.min(5, stars));
    for (let i = 0; i < 5; i++) {
      const filled = i < this.currentStars;
      this.stars[i].setText(filled ? '★' : '☆');
      this.stars[i].setColor(filled ? '#ffcc22' : '#666688');
    }
  }

  destroy(): void {
    for (const star of this.stars) star.destroy();
    this.stars.length = 0;
  }
}
