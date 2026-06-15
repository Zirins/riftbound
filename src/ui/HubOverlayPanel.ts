// src/ui/HubOverlayPanel.ts
// Modal overlay shell for Hub mail, tasks, and chronicle panels.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { ButtonPrimary } from './ButtonPrimary';

/** Full-screen dim that blocks pointer events to scene content below. */
export function createOverlayDim(
  scene: Phaser.Scene,
  alpha = 0.75,
): Phaser.GameObjects.Rectangle {
  const dim = scene.add.rectangle(
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2,
    CANVAS.WIDTH,
    CANVAS.HEIGHT,
    0x000000,
    alpha,
  );
  dim.setInteractive();
  return dim;
}

export class HubOverlayPanel {
  private container: Phaser.GameObjects.Container | null = null;
  private readonly buttons: ButtonPrimary[] = [];
  private readonly texts: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  open(title: string, onClose: () => void): void {
    this.close();

    const container = this.scene.add.container(0, 0);
    const dim = createOverlayDim(this.scene);

    const panel = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      520,
      220,
      0x1a1a2e,
    );
    panel.setStrokeStyle(2, 0x44ccff);

    const titleText = this.scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 90, title, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    container.add([dim, panel, titleText]);
    this.container = container;

    this.addButton(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 90, 'CLOSE', onClose, 100);
  }

  addText(x: number, y: number, text: string, color = '#cccccc'): void {
    const label = this.scene.add.text(x, y, text, {
      fontSize: '11px',
      color,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.texts.push(label);
  }

  addButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width?: number,
  ): ButtonPrimary {
    const button = new ButtonPrimary(this.scene, x, y, label, onClick, width);
    this.buttons.push(button);
    return button;
  }

  close(): void {
    this.container?.destroy(true);
    this.container = null;

    for (const button of this.buttons) button.destroy();
    this.buttons.length = 0;

    for (const text of this.texts) text.destroy();
    this.texts.length = 0;
  }

  destroy(): void {
    this.close();
  }
}
