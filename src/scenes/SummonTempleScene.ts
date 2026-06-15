// src/scenes/SummonTempleScene.ts
// Standard + Featured banner pulls, pity display, daily free summon.

import Phaser from 'phaser';
import { CANVAS, FEATURED_BANNER, GACHA, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { STANDARD_BANNER_ID } from '../data/banners';
import { HEROES_DATA } from '../data/heroes';
import * as GachaSystem from '../systems/GachaSystem';
import { FeaturedBannerSystem } from '../systems/FeaturedBannerSystem';
import { canAfford } from '../systems/EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

type BannerTab = 'standard' | 'featured';

function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export class SummonTempleScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SUMMON_TEMPLE;

  private activeTab: BannerTab = 'standard';
  private backButton: ButtonPrimary | null = null;
  private standardTabButton: ButtonPrimary | null = null;
  private featuredTabButton: ButtonPrimary | null = null;
  private freeButton: ButtonPrimary | null = null;
  private singleButton: ButtonPrimary | null = null;
  private tenButton: ButtonPrimary | null = null;
  private pityLabel: Phaser.GameObjects.Text | null = null;
  private bannerTitleLabel: Phaser.GameObjects.Text | null = null;
  private bannerDetailLabel: Phaser.GameObjects.Text | null = null;
  private crystalLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private dynamicTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: SummonTempleScene.KEY });
  }

  init(data: { tab?: BannerTab }): void {
    this.activeTab = data.tab ?? 'standard';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'SUMMON TEMPLE', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.standardTabButton = new ButtonPrimary(
      this,
      280,
      58,
      'STANDARD',
      () => this.switchTab('standard'),
      140,
      28,
    );

    this.featuredTabButton = new ButtonPrimary(
      this,
      440,
      58,
      'FEATURED',
      () => this.switchTab('featured'),
      140,
      28,
    );

    this.add.rectangle(CANVAS.WIDTH / 2, 130, 700, 110, 0x1a1a2e)
      .setStrokeStyle(2, this.activeTab === 'featured' ? 0xffcc44 : 0x44ccff);

    this.bannerTitleLabel = this.add.text(CANVAS.WIDTH / 2, 88, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.bannerDetailLabel = this.add.text(CANVAS.WIDTH / 2, 118, '', {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.pityLabel = this.add.text(CANVAS.WIDTH / 2, 148, '', {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const realm = loadCurrentRealm();
    const crystals = realm?.inventory.riftCrystals ?? 0;
    this.crystalLabel = this.add.text(
      CANVAS.WIDTH / 2,
      175,
      `Current Crystals: ${crystals} 💎`,
      { fontSize: '12px', color: '#44aaff', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    this.freeButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      220,
      'FREE PULL',
      () => this.handleFreePull(),
      280,
    );

    this.singleButton = new ButtonPrimary(
      this,
      220,
      CANVAS.HEIGHT - 55,
      `SINGLE PULL — ${GACHA.SINGLE_PULL_COST} 💎`,
      () => this.handlePull(1),
      240,
    );

    this.tenButton = new ButtonPrimary(
      this,
      580,
      CANVAS.HEIGHT - 55,
      `10-PULL — ${GACHA.TEN_PULL_COST} 💎`,
      () => this.handlePull(10),
      240,
    );

    this.renderActiveTab();
  }

  private switchTab(tab: BannerTab): void {
    this.activeTab = tab;
    this.scene.restart({ tab });
  }

  private renderActiveTab(): void {
    for (const text of this.dynamicTexts) text.destroy();
    this.dynamicTexts = [];

    if (this.activeTab === 'standard') {
      this.renderStandardTab();
    } else {
      this.renderFeaturedTab();
    }
  }

  private renderStandardTab(): void {
    this.bannerTitleLabel?.setText('ETERNAL RIFT — Standard Banner');
    this.bannerDetailLabel?.setText('Uncommon 60%  Rare 35%  Epic 4.5%  Legendary 0.5%');

    const pity = GachaSystem.getPityCount(STANDARD_BANNER_ID);
    const pityColor = pity >= GACHA.SOFT_PITY_START ? '#ff8844' : '#aaaacc';
    this.pityLabel?.setText(`Pity: ${pity} / ${GACHA.LEGENDARY_PITY} pulls until guaranteed Legendary`);
    this.pityLabel?.setColor(pityColor);

    const freeAvailable = GachaSystem.isFreeClaimAvailable();
    const freeLabel = freeAvailable
      ? 'FREE PULL (available)'
      : `FREE PULL (next: ${formatCountdown(GachaSystem.getFreePullCountdownMs())})`;
    this.freeButton?.setEnabled(freeAvailable);
    this.freeButton?.setText(freeLabel);

    this.singleButton?.setEnabled(canAfford('crystals', GACHA.SINGLE_PULL_COST));
    this.tenButton?.setEnabled(canAfford('crystals', GACHA.TEN_PULL_COST));
  }

  private renderFeaturedTab(): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    FeaturedBannerSystem.ensureState(save);
    saveCurrentRealm(save);

    const banner = FeaturedBannerSystem.getCurrentBanner(save);
    const featuredHero = HEROES_DATA.find((hero) => hero.id === banner.featuredHeroId);
    const pity = FeaturedBannerSystem.getPityCount(save);
    const guaranteed = FeaturedBannerSystem.isGuaranteedFeatured(save);
    const daysLeft = FeaturedBannerSystem.getDaysRemaining(save);

    this.bannerTitleLabel?.setText(`${banner.name.toUpperCase()} — Featured Banner`);
    this.bannerDetailLabel?.setText(
      `${banner.description}  ·  ${daysLeft}d remaining`,
    );

    const pityColor = pity >= FEATURED_BANNER.SOFT_PITY_START ? '#ff8844' : '#ffcc44';
    const guaranteeText = guaranteed ? '  ·  NEXT LEGENDARY: FEATURED GUARANTEED' : '';
    this.pityLabel?.setText(
      `Pity: ${pity} / ${FEATURED_BANNER.HARD_PITY}  ·  Soft pity at ${FEATURED_BANNER.SOFT_PITY_START}${guaranteeText}`,
    );
    this.pityLabel?.setColor(pityColor);

    this.freeButton?.setEnabled(false);
    this.freeButton?.setText('FREE PULL (standard only)');

    const rateLine = this.add.text(
      CANVAS.WIDTH / 2,
      128,
      `Featured rate-up: ${featuredHero?.name ?? banner.featuredHeroId}  ·  50/50 on Legendary`,
      { fontSize: '9px', color: '#ffcc44', fontFamily: 'monospace' },
    ).setOrigin(0.5);
    this.dynamicTexts.push(rateLine);

    this.singleButton?.setEnabled(canAfford('crystals', GACHA.SINGLE_PULL_COST));
    this.tenButton?.setEnabled(canAfford('crystals', GACHA.TEN_PULL_COST));
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.standardTabButton?.destroy();
    this.featuredTabButton?.destroy();
    this.freeButton?.destroy();
    this.singleButton?.destroy();
    this.tenButton?.destroy();
    this.pityLabel?.destroy();
    this.bannerTitleLabel?.destroy();
    this.bannerDetailLabel?.destroy();
    this.crystalLabel?.destroy();
    this.toastLabel?.destroy();
    for (const text of this.dynamicTexts) text.destroy();
    this.dynamicTexts = [];
    this.backButton = null;
    this.standardTabButton = null;
    this.featuredTabButton = null;
    this.freeButton = null;
    this.singleButton = null;
    this.tenButton = null;
    this.pityLabel = null;
    this.bannerTitleLabel = null;
    this.bannerDetailLabel = null;
    this.crystalLabel = null;
    this.toastLabel = null;
  }

  private handleFreePull(): void {
    const results = GachaSystem.claimFreePull();
    if (results.length === 0) {
      this.showToast('Free pull not available yet.');
      return;
    }
    this.scene.start(SCENE_KEYS.SUMMON_RESULT, { results, tab: this.activeTab });
  }

  private handlePull(count: 1 | 10): void {
    if (this.activeTab === 'standard') {
      const results = GachaSystem.pull(STANDARD_BANNER_ID, count);
      if (results.length === 0) {
        this.showToast('Not enough Crystals.');
        return;
      }
      this.scene.start(SCENE_KEYS.SUMMON_RESULT, { results, tab: 'standard' });
      return;
    }

    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const results = FeaturedBannerSystem.pull(save, count);
    if (results.length === 0) {
      this.showToast('Not enough Crystals.');
      return;
    }
    saveCurrentRealm(save);
    this.scene.start(SCENE_KEYS.SUMMON_RESULT, { results, tab: 'featured' });
  }

  private showToast(message: string): void {
    this.toastLabel?.destroy();
    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 100, message, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);
  }
}
