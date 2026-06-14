// src/scenes/SigilScene.ts
// Owned Sigil grid with filters and equip flow (Phase 11).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getSigilDefinition } from '../data/sigils';
import { HEROES_DATA } from '../data/heroes';
import { SigilSystem } from '../systems/SigilSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { OwnedSigil, RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { SigilDetailPanel } from '../ui/SigilDetailPanel';
import {
  matchesSigilFilters,
  SigilFilterBar,
  type SigilFilterState,
} from '../ui/SigilFilterBar';
import { SigilGrid, type SigilGridEntry } from '../ui/SigilGrid';

export class SigilScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SIGIL;

  private heroId = '';
  private slotIndex: 0 | 1 = 0;

  private backButton: ButtonPrimary | null = null;
  private headerLabel: Phaser.GameObjects.Text | null = null;
  private filterBar: SigilFilterBar | null = null;
  private sigilGrid: SigilGrid | null = null;
  private detailPanel: SigilDetailPanel | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  private selectedEntry: SigilGridEntry | null = null;
  private filters: SigilFilterState = { rarity: 'all', element: 'all', stat: 'all' };

  constructor() {
    super({ key: SigilScene.KEY });
  }

  init(data: { heroId?: string; slotIndex?: 0 | 1 }): void {
    this.heroId = data.heroId ?? '';
    this.slotIndex = data.slotIndex ?? 0;
    this.selectedEntry = null;
    this.filters = { rarity: 'all', element: 'all', stat: 'all' };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const save = this.loadSave();
    const heroData = HEROES_DATA.find((hero) => hero.id === this.heroId);
    if (!save || !heroData) {
      this.scene.start(SCENE_KEYS.ROSTER);
      return;
    }

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← BACK',
      () => this.scene.start(SCENE_KEYS.HERO_DETAIL, { heroId: this.heroId, tab: 'overview' }),
      110,
    );

    this.headerLabel = this.add.text(CANVAS.WIDTH / 2, 32, `SIGILS — ${heroData.name} · Slot ${this.slotIndex}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.filterBar = new SigilFilterBar(this, 48, 68, (state) => {
      this.filters = state;
      this.refreshGrid(save);
    });

    this.sigilGrid = new SigilGrid(this, 48, 168, (entry) => {
      this.selectedEntry = entry;
      const owned = SigilSystem.findOwnedSigil(save, entry.instanceId);
      this.detailPanel?.showEntry(entry, owned);
      this.refreshGrid(save);
    });

    this.detailPanel = new SigilDetailPanel(
      this,
      660,
      210,
      280,
      () => this.handleEquip(save),
      () => this.handleUpgrade(),
    );

    this.refreshGrid(save);
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    this.backButton?.destroy();
    this.headerLabel?.destroy();
    this.filterBar?.destroy();
    this.sigilGrid?.destroy();
    this.detailPanel?.destroy();

    this.backButton = null;
    this.headerLabel = null;
    this.filterBar = null;
    this.sigilGrid = null;
    this.detailPanel = null;
    this.selectedEntry = null;
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
  }

  private buildGridEntries(save: RealmSaveDataV3): SigilGridEntry[] {
    return save.sigilState.ownedSigils
      .map((owned) => this.toGridEntry(owned))
      .filter((entry): entry is SigilGridEntry => entry !== null)
      .filter((entry) => matchesSigilFilters(entry, this.filters));
  }

  private toGridEntry(owned: OwnedSigil): SigilGridEntry | null {
    const definition = getSigilDefinition(owned.definitionId);
    if (!definition) return null;
    return {
      instanceId: owned.instanceId,
      name: definition.name,
      rarity: definition.rarity,
      element: definition.element,
      primaryStat: definition.primaryStat.statType,
      level: owned.level,
      equippedHeroId: owned.equippedHeroId,
    };
  }

  private refreshGrid(save: RealmSaveDataV3): void {
    const entries = this.buildGridEntries(save);
    const selectedId = this.selectedEntry?.instanceId ?? this.sigilGrid?.getSelectedId() ?? null;
    this.sigilGrid?.setEntries(entries, selectedId);

    if (selectedId) {
      const entry = entries.find((item) => item.instanceId === selectedId) ?? null;
      const owned = entry ? SigilSystem.findOwnedSigil(save, entry.instanceId) : null;
      this.selectedEntry = entry;
      this.detailPanel?.showEntry(entry, owned);
    } else if (entries.length > 0) {
      const first = entries[0];
      this.selectedEntry = first;
      const owned = SigilSystem.findOwnedSigil(save, first.instanceId);
      this.detailPanel?.showEntry(first, owned);
      this.sigilGrid?.setEntries(entries, first.instanceId);
    } else {
      this.detailPanel?.showEntry(null, null);
    }
  }

  private handleEquip(save: RealmSaveDataV3): void {
    if (!this.selectedEntry) {
      this.showToast('Select a Sigil first');
      return;
    }

    const result = SigilSystem.equipSigil(
      save,
      this.heroId,
      this.selectedEntry.instanceId,
      this.slotIndex,
    );

    if (!result.success) {
      this.showToast(result.reason ?? 'Equip failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.start(SCENE_KEYS.HERO_DETAIL, { heroId: this.heroId, tab: 'overview' });
  }

  private handleUpgrade(): void {
    if (!this.selectedEntry) {
      this.showToast('Select a Sigil first');
      return;
    }

    this.scene.start(SCENE_KEYS.SIGIL_UPGRADE, {
      sigilInstanceId: this.selectedEntry.instanceId,
      heroId: this.heroId,
      returnScene: SCENE_KEYS.SIGIL,
      returnData: { heroId: this.heroId, slotIndex: this.slotIndex },
    });
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 24, message, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(2200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
