// src/scenes/RosterScene.ts
// Hero roster — browse all 10 pool heroes, sorted by RP descending.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import { computeRP } from '../systems/HeroProgressionSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { HERO_CARD_WIDTH, HeroCard } from '../ui/HeroCard';

const CARD_GAP = 6;
const CARD_ROW_Y = 185;
const CARD_START_X = 52;

export class RosterScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ROSTER;

  private backButton: ButtonPrimary | null = null;
  private readonly heroCards: HeroCard[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: RosterScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    const ownedById = new Map(
      (realm?.ownedHeroes ?? [])
        .filter((hero) => hero.isOwned)
        .map((hero) => [hero.heroId, hero]),
    );

    const rosterEntries = HEROES_DATA.map((heroData) => {
      const ownership = ownedById.get(heroData.id) ?? null;
      const rp = ownership ? computeRP(ownership, heroData) : 0;
      return { heroData, ownership, rp };
    });

    rosterEntries.sort((a, b) => b.rp - a.rp);

    this.add.text(220, 36, 'RELIC BEARERS', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH - 120, 36, 'Sort: POWER ▼', {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    rosterEntries.forEach((entry, index) => {
      const x = CARD_START_X + index * (HERO_CARD_WIDTH + CARD_GAP) + HERO_CARD_WIDTH / 2;
      const card = new HeroCard(
        this,
        x,
        CARD_ROW_Y,
        entry.heroData,
        entry.ownership,
        entry.rp,
        () => this.handleHeroTap(entry.heroData.id, entry.ownership !== null),
      );
      this.heroCards.push(card);
    });

    this.backButton = new ButtonPrimary(
      this,
      80,
      CANVAS.HEIGHT - 40,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      120,
    );
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    for (const card of this.heroCards) card.destroy();
    this.heroCards.length = 0;

    this.backButton?.destroy();
    this.backButton = null;
  }

  private handleHeroTap(heroId: string, isOwned: boolean): void {
    if (isOwned) {
      this.scene.start(SCENE_KEYS.HERO_DETAIL, { heroId });
      return;
    }
    this.showToast('Obtainable via Summon Temple');
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 70, message, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(2200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
