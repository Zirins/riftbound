// src/ui/HeroCard.ts
// Roster hero tile — optional portrait asset or colored-circle fallback.

import Phaser from 'phaser';
import { ASSET_PATHS } from '../constants/assetPaths';
import type { HeroData, HeroOwnershipState } from '../types';
import { loadOptionalTexture } from '../utils/assetFallback';
import { RarityBadge } from './RarityBadge';
import { StarRating } from './StarRating';

export const HERO_CARD_WIDTH = 88;
export const HERO_CARD_HEIGHT = 200;

const SILHOUETTE_COLOR = 0x333344;
const PORTRAIT_REGION_FRACTION = 0.65;
const PORTRAIT_ORIGIN_X = 0.5;
const PORTRAIT_ORIGIN_Y = 0.38;
const OVERLAY_ALPHA_BOTTOM = 0.85;

export class HeroCard {
  private readonly badge: RarityBadge;
  private readonly circle: Phaser.GameObjects.Rectangle;
  private portraitRenderTexture: Phaser.GameObjects.RenderTexture | null = null;
  private scrollContainer: Phaser.GameObjects.Container | null = null;
  private gradientOverlay: Phaser.GameObjects.Graphics | null = null;
  private cancelPortraitLoad: (() => void) | null = null;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly titleLabel: Phaser.GameObjects.Text;
  private readonly bpLabel: Phaser.GameObjects.Text;
  private readonly unknownLabel: Phaser.GameObjects.Text | null;
  private readonly starRating: StarRating | null;
  private readonly zone: Phaser.GameObjects.Zone;
  private readonly onTap: () => void;
  private readonly tapGuard?: () => boolean;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    heroData: HeroData,
    ownershipState: HeroOwnershipState | null,
    rp: number,
    onTap: () => void,
    tapGuard?: () => boolean,
  ) {
    this.onTap = onTap;
    this.tapGuard = tapGuard;
    const owned = ownershipState?.isOwned ?? false;
    const portraitRegionHeight = Math.floor(HERO_CARD_HEIGHT * PORTRAIT_REGION_FRACTION);
    const portraitTop = y - HERO_CARD_HEIGHT / 2;
    const portraitCenterY = portraitTop + portraitRegionHeight / 2;
    const bottomRegionTop = portraitTop + portraitRegionHeight;
    const bottomRegionHeight = HERO_CARD_HEIGHT - portraitRegionHeight;

    this.badge = new RarityBadge(
      scene,
      x,
      y,
      HERO_CARD_WIDTH,
      HERO_CARD_HEIGHT,
      heroData.rarity,
    );

    this.circle = scene.add.rectangle(
      x,
      portraitCenterY,
      HERO_CARD_WIDTH,
      portraitRegionHeight,
      owned ? heroData.color : SILHOUETTE_COLOR,
    );

    if (owned) {
      const portraitPath = ASSET_PATHS.heroes.portrait(heroData.id);
      const handle = loadOptionalTexture({
        scene,
        assetPath: portraitPath,
        onReady: (textureKey) => this.showPortrait(scene, x, portraitCenterY, textureKey),
      });
      this.cancelPortraitLoad = handle.cancel;

      if (scene.textures.exists(handle.textureKey)) {
        this.showPortrait(scene, x, portraitCenterY, handle.textureKey);
      }
    }

    this.unknownLabel = owned
      ? null
      : scene.add.text(x, portraitCenterY, '?', {
          fontSize: '22px',
          color: '#888899',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

    this.gradientOverlay = scene.add.graphics();
    this.gradientOverlay.fillGradientStyle(
      0x000000,
      0x000000,
      0x000000,
      0x000000,
      0,
      0,
      OVERLAY_ALPHA_BOTTOM,
      OVERLAY_ALPHA_BOTTOM,
    );
    this.gradientOverlay.fillRect(
      x - HERO_CARD_WIDTH / 2,
      bottomRegionTop,
      HERO_CARD_WIDTH,
      bottomRegionHeight,
    );

    this.nameLabel = scene.add.text(x - HERO_CARD_WIDTH / 2 + 8, bottomRegionTop + 16, owned ? heroData.name : '???', {
      fontSize: '13px',
      color: owned ? '#ffffff' : '#888899',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      wordWrap: { width: HERO_CARD_WIDTH - 12 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setX(x);

    this.titleLabel = scene.add.text(
      x,
      bottomRegionTop + 34,
      owned ? heroData.title : '',
      {
        fontSize: '10px',
        color: '#bbbbcc',
        fontFamily: 'monospace',
        fontStyle: 'italic',
        wordWrap: { width: HERO_CARD_WIDTH - 12 },
        align: 'center',
      },
    ).setOrigin(0.5, 0.5);

    this.bpLabel = scene.add.text(x, bottomRegionTop + 52, owned ? `BP: ${rp.toLocaleString()}` : '', {
      fontSize: '10px',
      color: owned ? '#aaaacc' : '#666677',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    this.starRating = owned
      ? new StarRating(scene, x - 28, y + HERO_CARD_HEIGHT / 2 + 10, ownershipState!.starRank)
      : null;

    this.zone = scene.add.zone(x, y, HERO_CARD_WIDTH, HERO_CARD_HEIGHT);
    this.zone.setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', this.handlePointerUp, this);
  }

  private showPortrait(
    scene: Phaser.Scene,
    x: number,
    portraitCenterY: number,
    textureKey: string,
  ): void {
    if (this.destroyed || !scene.textures.exists(textureKey)) return;

    scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.portraitRenderTexture?.destroy();
    this.portraitRenderTexture = null;

    const portraitRegionHeight = Math.floor(HERO_CARD_HEIGHT * PORTRAIT_REGION_FRACTION);

    const renderTexture = scene.add.renderTexture(0, 0, HERO_CARD_WIDTH, portraitRegionHeight);
    renderTexture.setOrigin(0.5, 0.5);
    renderTexture.setPosition(x, portraitCenterY);

    const tempImage = scene.make.image({ key: textureKey, x: 0, y: 0, add: false });
    tempImage.setOrigin(PORTRAIT_ORIGIN_X, PORTRAIT_ORIGIN_Y);
    renderTexture.draw(
      tempImage,
      HERO_CARD_WIDTH / 2,
      portraitRegionHeight / 2,
    );
    tempImage.destroy();

    this.portraitRenderTexture = renderTexture;
    this.attachPortraitToScrollContainer();

    this.circle.setVisible(false);
  }

  private attachPortraitToScrollContainer(): void {
    if (!this.scrollContainer || !this.portraitRenderTexture) return;
    if (this.scrollContainer.getIndex(this.portraitRenderTexture) !== -1) return;

    const circleIdx = this.scrollContainer.getIndex(this.circle);
    const insertAt = circleIdx >= 0 ? circleIdx + 1 : this.scrollContainer.length;
    this.scrollContainer.addAt(this.portraitRenderTexture, insertAt);
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelPortraitLoad?.();
    this.cancelPortraitLoad = null;
    this.zone.off('pointerup', this.handlePointerUp, this);
    this.zone.destroy();
    this.badge.destroy();
    this.circle.destroy();
    this.portraitRenderTexture?.destroy();
    this.portraitRenderTexture = null;
    this.scrollContainer = null;
    this.nameLabel.destroy();
    this.titleLabel.destroy();
    this.bpLabel.destroy();
    this.gradientOverlay?.destroy();
    this.gradientOverlay = null;
    this.unknownLabel?.destroy();
    this.starRating?.destroy();
  }

  private readonly handlePointerUp = (): void => {
    if (this.tapGuard?.()) return;
    this.onTap();
  };

  reparentTo(container: Phaser.GameObjects.Container): void {
    this.scrollContainer = container;
    this.badge.reparentTo(container);
    container.add(this.circle);
    this.attachPortraitToScrollContainer();
    if (this.gradientOverlay) container.add(this.gradientOverlay);
    if (this.unknownLabel) container.add(this.unknownLabel);
    container.add(this.nameLabel);
    container.add(this.titleLabel);
    container.add(this.bpLabel);
    this.starRating?.reparentTo(container);
    container.add(this.zone);
  }
}
