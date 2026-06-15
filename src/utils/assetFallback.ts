// src/utils/assetFallback.ts
// Safe optional-image loading for Phaser 3.
//
// Approach: runtime Phaser Loader with loaderror handling (not preload-time existence checks).
// Phaser has no synchronous "file exists" API in the browser; we show placeholders immediately,
// queue loader.image(), swap on filecomplete, and keep placeholders on loaderror.

import type Phaser from 'phaser';

export function textureKeyFromAssetPath(assetPath: string): string {
  return `asset_${assetPath.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export interface LoadOptionalTextureOptions {
  scene: Phaser.Scene;
  assetPath: string;
  onReady: (textureKey: string) => void;
  onFallback?: () => void;
}

export interface LoadOptionalTextureHandle {
  textureKey: string;
  cancel: () => void;
}

/**
 * Loads an image if not already cached. Calls onReady when the texture is available.
 * On 404/load failure, keeps the placeholder (onFallback) and logs in dev only.
 */
export function loadOptionalTexture(options: LoadOptionalTextureOptions): LoadOptionalTextureHandle {
  const { scene, assetPath, onReady, onFallback } = options;
  const textureKey = textureKeyFromAssetPath(assetPath);

  if (scene.textures.exists(textureKey)) {
    onReady(textureKey);
    return { textureKey, cancel: () => {} };
  }

  const completeEvent = `filecomplete-image-${textureKey}`;

  const onComplete = (key: string): void => {
    if (key !== textureKey) return;
    if (scene.textures.exists(textureKey)) {
      onReady(textureKey);
    }
  };

  const onError = (file: Phaser.Loader.File): void => {
    if (file.key !== textureKey) return;
    if (import.meta.env.DEV) {
      console.info('[assetFallback] missing asset, using placeholder:', assetPath);
    }
    onFallback?.();
  };

  scene.load.image(textureKey, assetPath);
  scene.load.once(completeEvent, onComplete);
  scene.load.once('loaderror', onError);

  if (!scene.load.isLoading()) {
    scene.load.start();
  }

  const cancel = (): void => {
    scene.load.off(completeEvent, onComplete);
    scene.load.off('loaderror', onError);
  };

  return { textureKey, cancel };
}
