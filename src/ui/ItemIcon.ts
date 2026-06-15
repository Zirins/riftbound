// src/ui/ItemIcon.ts
// Item/currency icon with colored primitive fallback when assets are missing.

import Phaser from 'phaser';
import { loadOptionalTexture } from '../utils/assetFallback';

export class ItemIcon {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fallback: Phaser.GameObjects.Rectangle;
  private readonly letter: Phaser.GameObjects.Text;
  private image: Phaser.GameObjects.Image | null = null;
  private cancelLoad: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly size: number,
    options: {
      iconPath?: string;
      label: string;
      color: number;
    },
  ) {
    this.container = scene.add.container(x, y);
    this.fallback = scene.add.rectangle(0, 0, size, size, options.color).setStrokeStyle(1, 0xcccccc);
    this.letter = scene.add.text(0, 0, options.label.slice(0, 1).toUpperCase(), {
      fontSize: `${Math.floor(size * 0.45)}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.container.add([this.fallback, this.letter]);

    if (options.iconPath) {
      const handle = loadOptionalTexture({
        scene,
        assetPath: options.iconPath,
        onReady: () => this.showImage(handle.textureKey),
      });
      this.cancelLoad = handle.cancel;

      if (scene.textures.exists(handle.textureKey)) {
        this.showImage(handle.textureKey);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelLoad?.();
    this.cancelLoad = null;
    this.image?.destroy();
    this.container.destroy();
  }

  reparentTo(parent: Phaser.GameObjects.Container): void {
    parent.add(this.container);
  }

  private showImage(textureKey: string): void {
    if (this.destroyed || !this.scene.textures.exists(textureKey)) {
      return;
    }

    this.image?.destroy();
    this.image = this.scene.add.image(0, 0, textureKey).setDisplaySize(this.size, this.size);
    this.container.addAt(this.image, 0);
    this.fallback.setVisible(false);
    this.letter.setVisible(false);
  }
}
