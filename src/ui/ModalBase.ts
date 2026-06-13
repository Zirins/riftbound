// src/ui/ModalBase.ts
// Semi-transparent overlay with title, message, and confirm/cancel actions.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';

export interface ModalBaseOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ModalButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

const BUTTON_HEIGHT = 36;

export class ModalBase {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly buttons: ModalButtonParts[] = [];

  constructor(
    scene: Phaser.Scene,
    title: string,
    message: string,
    options: ModalBaseOptions,
  ) {
    this.scene = scene;
    const confirmLabel = options.confirmLabel ?? 'CONFIRM';
    const cancelLabel = options.cancelLabel ?? 'CANCEL';

    this.container = scene.add.container(0, 0).setDepth(200);
    this.container.setSize(CANVAS.WIDTH, CANVAS.HEIGHT);

    const dim = scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HEIGHT,
      0x000000,
      0.8,
    );

    const panel = scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      420,
      180,
      0x1a1a2e,
    );
    panel.setStrokeStyle(2, 0x44ccff);

    const titleText = scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 56, title, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const messageText = scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 12, message, {
      fontSize: '11px',
      color: '#cccccc',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 360 },
    }).setOrigin(0.5);

    this.container.add([dim, panel, titleText, messageText]);

    this.addButton(
      CANVAS.WIDTH / 2 - 80,
      CANVAS.HEIGHT / 2 + 56,
      cancelLabel,
      options.onCancel,
      120,
    );
    this.addButton(
      CANVAS.WIDTH / 2 + 80,
      CANVAS.HEIGHT / 2 + 56,
      confirmLabel,
      options.onConfirm,
      120,
    );
  }

  private addButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width: number,
  ): void {
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
    this.buttons.push({ bg, label: text, zone });
  }

  destroy(): void {
    for (const button of this.buttons) button.zone.off('pointerup');
    this.buttons.length = 0;
    this.container.destroy(true);
  }
}
