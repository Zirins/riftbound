// src/ui/heroPortraitVisuals.ts
// Rounded-square and circle portrait crops for battle HUD and unit sprites.

import Phaser from 'phaser';
import { ASSET_PATHS } from '../constants/assetPaths';
import { loadOptionalTexture } from '../utils/assetFallback';

export const BATTLE_HUD_PORTRAIT_SIZE = 60;
export const BATTLE_HUD_PORTRAIT_CORNER_RADIUS = 8;

export type PortraitBody = Phaser.GameObjects.Arc | Phaser.GameObjects.RenderTexture;

export interface PortraitVisualBundle {
  body: PortraitBody;
  maskGraphics: Phaser.GameObjects.Graphics | null;
  cancelPortraitLoad: (() => void) | null;
}

function drawCoverPortrait(
  scene: Phaser.Scene,
  textureKey: string,
  renderTexture: Phaser.GameObjects.RenderTexture,
  drawWidth: number,
  drawHeight: number,
): void {
  scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

  const tempImage = scene.make.image({ key: textureKey, x: 0, y: 0, add: false });
  const nativeWidth = tempImage.width;
  const nativeHeight = tempImage.height;
  const coverScale = Math.max(drawWidth / nativeWidth, drawHeight / nativeHeight);
  tempImage.setScale(coverScale);
  tempImage.setOrigin(0.5, 0.5);
  renderTexture.draw(tempImage, drawWidth / 2, drawHeight / 2);
  tempImage.destroy();
}

export function createRoundedSquarePortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  size = BATTLE_HUD_PORTRAIT_SIZE,
  cornerRadius = BATTLE_HUD_PORTRAIT_CORNER_RADIUS,
  depth = 0,
): { body: Phaser.GameObjects.RenderTexture; maskGraphics: Phaser.GameObjects.Graphics } {
  const renderTexture = scene.add.renderTexture(0, 0, size, size);
  scene.textures.get(renderTexture.texture.key)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  renderTexture.setOrigin(0.5, 0.5);
  renderTexture.setPosition(x, y);
  renderTexture.setDepth(depth);

  drawCoverPortrait(scene, textureKey, renderTexture, size, size);

  const maskGraphics = scene.add.graphics();
  maskGraphics.setVisible(false);
  maskGraphics.fillStyle(0xffffff, 1);
  maskGraphics.fillRoundedRect(x - size / 2, y - size / 2, size, size, cornerRadius);
  renderTexture.setMask(maskGraphics.createGeometryMask());

  return { body: renderTexture, maskGraphics };
}

export function createCirclePortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string,
  diameter: number,
  depth = 0,
): { body: Phaser.GameObjects.RenderTexture; maskGraphics: Phaser.GameObjects.Graphics } {
  const radius = diameter / 2;
  const renderTexture = scene.add.renderTexture(0, 0, diameter, diameter);
  scene.textures.get(renderTexture.texture.key)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  renderTexture.setOrigin(0.5, 0.5);
  renderTexture.setPosition(x, y);
  renderTexture.setDepth(depth);

  drawCoverPortrait(scene, textureKey, renderTexture, diameter, diameter);

  const maskGraphics = scene.add.graphics();
  maskGraphics.setVisible(false);
  maskGraphics.fillStyle(0xffffff, 1);
  maskGraphics.fillCircle(x, y, radius);
  renderTexture.setMask(maskGraphics.createGeometryMask());

  return { body: renderTexture, maskGraphics };
}

export function createColoredCircleFallback(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  depth = 0,
): Phaser.GameObjects.Arc {
  const circle = scene.add.circle(x, y, radius, color);
  circle.setDepth(depth);
  return circle;
}

export function swapPortraitBody(
  currentBody: PortraitBody,
  maskGraphics: Phaser.GameObjects.Graphics | null,
  factory: () => { body: Phaser.GameObjects.RenderTexture; maskGraphics: Phaser.GameObjects.Graphics },
): { body: PortraitBody; maskGraphics: Phaser.GameObjects.Graphics } {
  const depth = currentBody.depth;
  const alpha = currentBody.alpha;
  const visible = currentBody.visible;
  const { x, y } = currentBody;

  currentBody.destroy();
  maskGraphics?.destroy();

  const created = factory();
  created.body.setPosition(x, y);
  created.body.setDepth(depth);
  created.body.setAlpha(alpha);
  created.body.setVisible(visible);

  return created;
}

export function loadHeroPortrait(
  scene: Phaser.Scene,
  heroId: string,
  onReady: (textureKey: string) => void,
  onFallback?: () => void,
): () => void {
  const handle = loadOptionalTexture({
    scene,
    assetPath: ASSET_PATHS.heroes.portrait(heroId),
    onReady,
    onFallback,
  });
  return handle.cancel;
}

export function destroyPortraitVisual(bundle: PortraitVisualBundle): void {
  bundle.cancelPortraitLoad?.();
  bundle.maskGraphics?.destroy();
  bundle.body.destroy();
}
