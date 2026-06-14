// src/scenes/SummonTempleScene.ts
// Standard banner pulls, pity display, and daily free summon.

import Phaser from 'phaser';
import { CANVAS, GACHA, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { STANDARD_BANNER_ID } from '../data/banners';
import { HEROES_DATA } from '../data/heroes';
import * as GachaSystem from '../systems/GachaSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { canAfford } from '../systems/EconomySystem';

function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export class SummonTempleScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SUMMON_TEMPLE;

  private backButton: ButtonPrimary | null = null;
  private freeButton: ButtonPrimary | null = null;
  private singleButton: ButtonPrimary | null = null;
  private tenButton: ButtonPrimary | null = null;
  private pityLabel: Phaser.GameObjects.Text | null = null;
  private crystalLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: SummonTempleScene.KEY });
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

    this.add.rectangle(CANVAS.WIDTH / 2, 130, 700, 110, 0x1a1a2e)
      .setStrokeStyle(2, 0x44ccff);

    this.add.text(CANVAS.WIDTH / 2, 88, 'ETERNAL RIFT — Standard Banner', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const heroPreview = HEROES_DATA.map((h) => h.name).join('  ');
    this.add.text(CANVAS.WIDTH / 2, 108, heroPreview, {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, 128, 'Uncommon 60%  Rare 35%  Epic 4.5%  Legendary 0.5%', {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const pity = GachaSystem.getPityCount(STANDARD_BANNER_ID);
    const pityColor = pity >= GACHA.SOFT_PITY_START ? '#ff8844' : '#aaaacc';
    this.pityLabel = this.add.text(
      CANVAS.WIDTH / 2,
      148,
      `Pity: ${pity} / ${GACHA.LEGENDARY_PITY} pulls until guaranteed Legendary`,
      { fontSize: '10px', color: pityColor, fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const realm = loadCurrentRealm();
    const crystals = realm?.inventory.riftCrystals ?? 0;
    this.crystalLabel = this.add.text(
      CANVAS.WIDTH / 2,
      175,
      `Current Crystals: ${crystals} 💎`,
      { fontSize: '12px', color: '#44aaff', fontFamily: 'monospace' },
    ).setOrigin(0.5);

    const freeAvailable = GachaSystem.isFreeClaimAvailable();
    const freeLabel = freeAvailable
      ? 'FREE PULL (available)'
      : `FREE PULL (next: ${formatCountdown(GachaSystem.getFreePullCountdownMs())})`;

    this.freeButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      220,
      freeLabel,
      () => this.handleFreePull(),
      280,
    );
    this.freeButton.setEnabled(freeAvailable);

    this.singleButton = new ButtonPrimary(
      this,
      220,
      CANVAS.HEIGHT - 55,
      `SINGLE PULL — ${GACHA.SINGLE_PULL_COST} 💎`,
      () => this.handlePull(1),
      240,
    );
    this.singleButton.setEnabled(canAfford('crystals', GACHA.SINGLE_PULL_COST));

    this.tenButton = new ButtonPrimary(
      this,
      580,
      CANVAS.HEIGHT - 55,
      `10-PULL — ${GACHA.TEN_PULL_COST} 💎`,
      () => this.handlePull(10),
      240,
    );
    this.tenButton.setEnabled(canAfford('crystals', GACHA.TEN_PULL_COST));
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.freeButton?.destroy();
    this.singleButton?.destroy();
    this.tenButton?.destroy();
    this.pityLabel?.destroy();
    this.crystalLabel?.destroy();
    this.toastLabel?.destroy();
    this.backButton = null;
    this.freeButton = null;
    this.singleButton = null;
    this.tenButton = null;
    this.pityLabel = null;
    this.crystalLabel = null;
    this.toastLabel = null;
  }

  private handleFreePull(): void {
    const results = GachaSystem.claimFreePull();
    if (results.length === 0) {
      this.showToast('Free pull not available yet.');
      return;
    }
    this.scene.start(SCENE_KEYS.SUMMON_RESULT, { results });
  }

  private handlePull(count: 1 | 10): void {
    const results = GachaSystem.pull(STANDARD_BANNER_ID, count);
    if (results.length === 0) {
      this.showToast('Not enough Crystals.');
      return;
    }
    this.scene.start(SCENE_KEYS.SUMMON_RESULT, { results });
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
