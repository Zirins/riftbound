// src/ui/ItemIcon.ts
// Item/currency icon with colored primitive fallback when assets are missing.

import Phaser from 'phaser';

function textureKeyFromPath(path: string): string {
  return `icon_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export class ItemIcon {
  private readonly container: Phaser.GameObjects.Container;
  private readonly fallback: Phaser.GameObjects.Rectangle;
  private readonly letter: Phaser.GameObjects.Text;
  private image: Phaser.GameObjects.Image | null = null;
  private readonly textureKey: string | null;
  private destroyed = false;

  private readonly onLoadComplete: (key: string) => void;
  private readonly onLoadError: (file: Phaser.Loader.File) => void;

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

    this.onLoadComplete = (key: string) => {
      if (this.destroyed || key !== this.textureKey) return;
      this.showImage();
    };

    this.onLoadError = (file: Phaser.Loader.File) => {
      if (this.destroyed || file.key !== this.textureKey) return;
      if (import.meta.env.DEV) {
        console.warn('[ItemIcon] missing asset, using fallback:', file.url);
      }
    };

    if (options.iconPath) {
      this.textureKey = textureKeyFromPath(options.iconPath);
      if (scene.textures.exists(this.textureKey)) {
        this.showImage();
      } else {
        scene.load.image(this.textureKey, options.iconPath);
        scene.load.once(`filecomplete-image-${this.textureKey}`, this.onLoadComplete);
        scene.load.once('loaderror', this.onLoadError);
        if (!scene.load.isLoading()) {
          scene.load.start();
        }
      }
    } else {
      this.textureKey = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.textureKey) {
      this.scene.load.off(`filecomplete-image-${this.textureKey}`, this.onLoadComplete);
      this.scene.load.off('loaderror', this.onLoadError);
    }
    this.image?.destroy();
    this.container.destroy();
  }

  private showImage(): void {
    if (this.destroyed || !this.textureKey || !this.scene.textures.exists(this.textureKey)) {
      return;
    }

    this.image?.destroy();
    this.image = this.scene.add.image(0, 0, this.textureKey).setDisplaySize(this.size, this.size);
    this.container.addAt(this.image, 0);
    this.fallback.setVisible(false);
    this.letter.setVisible(false);
  }
}
