// src/ui/BossBar.ts
// Rift Warden boss HP bar — visible only during boss wave.

import Phaser from 'phaser';
import { CANVAS, UI, WARDEN } from '../constants/gameConfig';

export class BossBar {
  private background!: Phaser.GameObjects.Rectangle;
  private fill!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {}

  create(): void {
    const y = UI.BOSS_BAR_Y + UI.BOSS_BAR_HEIGHT / 2;
    const x = CANVAS.WIDTH / 2;

    this.background = this.scene.add.rectangle(
      x,
      y,
      UI.BOSS_BAR_WIDTH,
      UI.BOSS_BAR_HEIGHT,
      UI.HP_BAR_BG_COLOR,
      1,
    );

    this.fill = this.scene.add.rectangle(
      x - UI.BOSS_BAR_WIDTH / 2,
      y,
      UI.BOSS_BAR_WIDTH,
      UI.BOSS_BAR_HEIGHT,
      UI.BOSS_BAR_COLOR,
      1,
    );
    this.fill.setOrigin(0, 0.5);

    this.label = this.scene.add.text(x, UI.BOSS_BAR_Y - 4, 'Rift Warden', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1);

    this.setVisible(false);
  }

  update(currentHP: number, maxHP: number = WARDEN.HP): void {
    const ratio = Math.max(0, Math.min(1, currentHP / maxHP));
    this.fill.width = UI.BOSS_BAR_WIDTH * ratio;
  }

  setVisible(visible: boolean): void {
    this.background.setVisible(visible);
    this.fill.setVisible(visible);
    this.label.setVisible(visible);
  }

  destroy(): void {
    this.background?.destroy();
    this.fill?.destroy();
    this.label?.destroy();
  }
}
