// src/ui/OptionalBackground.ts
// Full-scene background image with solid-color rectangle fallback.

import Phaser from 'phaser';
import { loadOptionalTexture } from '../utils/assetFallback';

export class OptionalBackground {
  private readonly fallback: Phaser.GameObjects.Rectangle;
  private image: Phaser.GameObjects.Image | null = null;
  private cancelLoad: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    width: number,
    height: number,
    options: {
      assetPath?: string | null;
      fallbackColor: number;
      depth?: number;
    },
  ) {
    this.fallback = scene.add.rectangle(width / 2, height / 2, width, height, options.fallbackColor);
    if (options.depth !== undefined) {
      this.fallback.setDepth(options.depth);
    }

    if (options.assetPath) {
      const handle = loadOptionalTexture({
        scene,
        assetPath: options.assetPath,
        onReady: (textureKey) => this.showImage(textureKey, width, height, options.depth),
        onFallback: () => {},
      });
      this.cancelLoad = handle.cancel;
    }
  }

  private showImage(textureKey: string, width: number, height: number, depth?: number): void {
    if (this.destroyed) return;

    this.image?.destroy();
    this.image = this.scene.add.image(width / 2, height / 2, textureKey).setDisplaySize(width, height);
    if (depth !== undefined) {
      this.image.setDepth(depth);
    }
    this.fallback.setVisible(false);
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelLoad?.();
    this.cancelLoad = null;
    this.image?.destroy();
    this.image = null;
    this.fallback.destroy();
  }
}
