// src/scenes/RosterScene.ts
// Hero roster — browse all 10 pool heroes, sorted by RP descending.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import { computeRP } from '../systems/HeroProgressionSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { HERO_CARD_HEIGHT, HERO_CARD_WIDTH, HeroCard } from '../ui/HeroCard';
import { HorizontalDragScroll } from '../ui/HorizontalDragScroll';
import type { RealmSaveDataV3 } from '../types';

const CARD_GAP = 8;
const CARD_START_X = 52;
const SCROLL_VIEWPORT_Y = 56;
const SCROLL_VIEWPORT_HEIGHT = HERO_CARD_HEIGHT + 10;
const CARD_ROW_Y = SCROLL_VIEWPORT_Y + SCROLL_VIEWPORT_HEIGHT / 2;

export class RosterScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ROSTER;

  private backLabel: Phaser.GameObjects.Text | null = null;
  private backZone: Phaser.GameObjects.Zone | null = null;
  private heroScroll: HorizontalDragScroll | null = null;
  private readonly heroCards: HeroCard[] = [];
  private sortLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: RosterScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const save = this.loadSave();
    if (!save) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    this.backLabel = this.add.text(24, 28, '←', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.backZone = this.add.zone(24, 28, 40, 36);
    this.backZone.setInteractive({ useHandCursor: true });
    this.backZone.on('pointerup', () => this.scene.start(SCENE_KEYS.HUB));

    this.sortLabel = this.add.text(CANVAS.WIDTH - 120, 36, 'Sort: POWER ▼', {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderHeroesTab(save);
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    for (const card of this.heroCards) card.destroy();
    this.heroCards.length = 0;

    this.heroScroll?.destroy();
    this.heroScroll = null;

    this.backZone?.removeAllListeners();
    this.backZone?.destroy();
    this.backZone = null;
    this.backLabel?.destroy();
    this.backLabel = null;

    this.sortLabel?.destroy();
    this.sortLabel = null;
  }

  private renderHeroesTab(save: RealmSaveDataV3): void {
    const ownedById = new Map(
      save.ownedHeroes
        .filter((hero) => hero.isOwned)
        .map((hero) => [hero.heroId, hero]),
    );

    const rosterEntries = HEROES_DATA.map((heroData) => {
      const ownership = ownedById.get(heroData.id) ?? null;
      const rp = ownership ? computeRP(ownership, heroData) : 0;
      return { heroData, ownership, rp };
    });

    rosterEntries.sort((a, b) => b.rp - a.rp);

    this.heroScroll = new HorizontalDragScroll(
      this,
      0,
      SCROLL_VIEWPORT_Y,
      CANVAS.WIDTH,
      SCROLL_VIEWPORT_HEIGHT,
    );

    const contentWidth = CARD_START_X
      + rosterEntries.length * (HERO_CARD_WIDTH + CARD_GAP);
    this.heroScroll.setContentWidth(contentWidth);

    const heroScroll = this.heroScroll;
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
        () => heroScroll.shouldConsumeTap(),
      );
      card.reparentTo(heroScroll.container);
      this.heroCards.push(card);
    });
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
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
