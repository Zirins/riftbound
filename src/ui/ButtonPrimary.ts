// src/ui/ButtonPrimary.ts
// Standard tappable button with enabled/disabled states.

import Phaser from 'phaser';
import { UI } from '../constants/gameConfig';

const ENABLED_FILL = 0x3355aa;
const DISABLED_FILL = 0x444455;
const ENABLED_TEXT = '#ffffff';
const DISABLED_TEXT = '#888888';

export class ButtonPrimary {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly onClick: () => void,
    width: number = UI.SCENE_NAV_BUTTON_WIDTH,
    height: number = UI.SCENE_NAV_BUTTON_HEIGHT,
  ) {
    this.bg = scene.add.rectangle(x, y, width, height, ENABLED_FILL);
    this.label = scene.add.text(x, y, text, {
      fontSize: '16px',
      color: ENABLED_TEXT,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.zone = scene.add.zone(x, y, width, height);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', this.handlePointerUp, this);
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.bg.setFillStyle(value ? ENABLED_FILL : DISABLED_FILL);
    this.label.setColor(value ? ENABLED_TEXT : DISABLED_TEXT);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  destroy(): void {
    this.zone.off('pointerup', this.handlePointerUp, this);
    this.zone.destroy();
    this.bg.destroy();
    this.label.destroy();
  }

  private readonly handlePointerUp = (): void => {
    if (this.enabled) {
      this.onClick();
    }
  };
}
