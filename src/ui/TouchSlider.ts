// src/ui/TouchSlider.ts
// Horizontal 0–100 touch slider for settings volume controls.

import Phaser from 'phaser';

export class TouchSlider {
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly valueLabel: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly trackX: number;
  private readonly trackWidth: number;
  private value: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    initialValue: number,
    private readonly onChange: (value: number) => void,
  ) {
    this.trackX = x;
    this.trackWidth = width;
    this.value = Phaser.Math.Clamp(Math.round(initialValue), 0, 100);

    this.track = scene.add.rectangle(x + width / 2, y, width, 10, 0x333344).setOrigin(0.5);
    this.fill = scene.add.rectangle(x, y, 0, 10, 0x44aaff).setOrigin(0, 0.5);
    this.knob = scene.add.circle(x, y, 8, 0xffffff);
    this.valueLabel = scene.add.text(x + width + 16, y, String(this.value), {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.zone = scene.add.zone(x + width / 2, y, width, 28);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', this.handlePointer, this);
    this.zone.on('pointermove', this.handlePointer, this);

    this.applyValue(this.value, false);
  }

  getValue(): number {
    return this.value;
  }

  setValue(value: number): void {
    this.applyValue(Phaser.Math.Clamp(Math.round(value), 0, 100), false);
  }

  destroy(): void {
    this.zone.off('pointerdown', this.handlePointer, this);
    this.zone.off('pointermove', this.handlePointer, this);
    this.zone.destroy();
    this.track.destroy();
    this.fill.destroy();
    this.knob.destroy();
    this.valueLabel.destroy();
  }

  private readonly handlePointer = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.isDown) return;
    const ratio = Phaser.Math.Clamp((pointer.x - this.trackX) / this.trackWidth, 0, 1);
    const nextValue = Math.round(ratio * 100);
    this.applyValue(nextValue, true);
  };

  private applyValue(value: number, notify: boolean): void {
    this.value = value;
    const ratio = value / 100;
    this.fill.width = this.trackWidth * ratio;
    this.knob.x = this.trackX + this.trackWidth * ratio;
    this.valueLabel.setText(String(value));
    if (notify) this.onChange(value);
  }
}
