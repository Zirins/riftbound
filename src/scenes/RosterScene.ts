// src/scenes/RosterScene.ts
// Hero roster — browse all 10 pool heroes, sorted by RP descending.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import { computeRP } from '../systems/HeroProgressionSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { BondOverlay } from '../ui/BondOverlay';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { HERO_CARD_WIDTH, HeroCard } from '../ui/HeroCard';
import { HorizontalDragScroll } from '../ui/HorizontalDragScroll';
import type { RealmSaveDataV3 } from '../types';

type RosterTab = 'heroes' | 'bonds';

const CARD_GAP = 6;
const CARD_ROW_Y = 185;
const CARD_START_X = 52;
const SCROLL_VIEWPORT_Y = 90;
const SCROLL_VIEWPORT_HEIGHT = 200;
const TAB_WIDTH = 140;
const TAB_HEIGHT = 28;
const TAB_GAP = 12;

export class RosterScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.ROSTER;

  private activeTab: RosterTab = 'heroes';

  private backButton: ButtonPrimary | null = null;
  private heroScroll: HorizontalDragScroll | null = null;
  private bondOverlay: BondOverlay | null = null;
  private readonly heroCards: HeroCard[] = [];
  private readonly tabBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private readonly tabLabels: Phaser.GameObjects.Text[] = [];
  private readonly tabZones: Phaser.GameObjects.Zone[] = [];
  private titleLabel: Phaser.GameObjects.Text | null = null;
  private sortLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: RosterScene.KEY });
  }

  init(data: { tab?: RosterTab }): void {
    this.activeTab = data.tab ?? 'heroes';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const save = this.loadSave();
    if (!save) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    this.titleLabel = this.add.text(220, 36, 'RELIC BEARERS', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.sortLabel = this.add.text(CANVAS.WIDTH - 120, 36, 'Sort: POWER ▼', {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderTabBar();

    this.bondOverlay = new BondOverlay(this);
    this.bondOverlay.refresh(save);

    this.renderHeroesTab(save);

    this.backButton = new ButtonPrimary(
      this,
      80,
      CANVAS.HEIGHT - 40,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      120,
    );

    this.applyTabVisibility();
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

    this.bondOverlay?.destroy();
    this.bondOverlay = null;

    this.backButton?.destroy();
    this.backButton = null;

    this.titleLabel?.destroy();
    this.sortLabel?.destroy();
    this.titleLabel = null;
    this.sortLabel = null;

    for (const zone of this.tabZones) {
      zone.removeAllListeners();
      zone.destroy();
    }
    this.tabZones.length = 0;
    for (const bg of this.tabBackgrounds) bg.destroy();
    this.tabBackgrounds.length = 0;
    for (const label of this.tabLabels) label.destroy();
    this.tabLabels.length = 0;
  }

  private renderTabBar(): void {
    const tabs: { id: RosterTab; label: string }[] = [
      { id: 'heroes', label: 'HEROES' },
      { id: 'bonds', label: 'BONDS' },
    ];
    const startX = CANVAS.WIDTH / 2 - (tabs.length * TAB_WIDTH + TAB_GAP) / 2;

    tabs.forEach((tab, index) => {
      const x = startX + index * (TAB_WIDTH + TAB_GAP) + TAB_WIDTH / 2;
      const y = 68;
      const isSelected = this.activeTab === tab.id;
      const bg = this.add.rectangle(x, y, TAB_WIDTH, TAB_HEIGHT, isSelected ? 0x334466 : 0x222233)
        .setStrokeStyle(1, isSelected ? 0x6688aa : 0x444466);
      const label = this.add.text(x, y, tab.label, {
        fontSize: '10px',
        color: isSelected ? '#ffffff' : '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x, y, TAB_WIDTH, TAB_HEIGHT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (this.activeTab !== tab.id) {
          this.scene.restart({ tab: tab.id });
        }
      });

      this.tabBackgrounds.push(bg);
      this.tabLabels.push(label);
      this.tabZones.push(zone);
    });
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

  private applyTabVisibility(): void {
    const showHeroes = this.activeTab === 'heroes';
    this.heroScroll?.container.setVisible(showHeroes);
    this.sortLabel?.setVisible(showHeroes);
    this.bondOverlay?.setVisible(!showHeroes);
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
