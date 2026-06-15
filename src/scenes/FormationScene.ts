// src/scenes/FormationScene.ts
// V0.1: team lineup selection — tap roster heroes to toggle; right-aligned by frontline priority.

import Phaser from 'phaser';
import {
  CANVAS,
  FORMATION,
  UI,
} from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import { getStageData } from '../systems/StageLoader';
import { getOpponentById } from '../systems/ArenaMatchSystem';
import {
  FormationPresetSystem,
  PRESET_NAME_OPTIONS,
} from '../systems/FormationPresetSystem';
import { loadCurrentRealm, saveCurrentRealm, saveFormationSlots } from '../systems/SaveSystem';
import type { FormationGrid, HeroClass, RealmSaveDataV3 } from '../types';
import { FormationPresetToolbar } from '../ui/FormationPresetToolbar';
import { HubOverlayPanel } from '../ui/HubOverlayPanel';
import { HorizontalDragScroll } from '../ui/HorizontalDragScroll';

const DEFAULT_LINEUP_HERO_IDS = ['kael', 'sura', 'mira', 'nyra'] as const;

interface RosterHero {
  id: string;
  name: string;
  classLabel: string;
  color: number;
  heroClass: HeroClass;
}

interface LineupSlotVisual {
  platform: Phaser.GameObjects.Rectangle;
  heroCircle?: Phaser.GameObjects.Arc;
  heroName?: Phaser.GameObjects.Text;
  heroTapZone?: Phaser.GameObjects.Zone;
}

interface RosterVisual {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  tapZone: Phaser.GameObjects.Zone;
}

/** Lower value = further back / leftmost when packed right. Tank is highest frontline. */
const FRONTLINE_SORT_PRIORITY: Record<HeroClass, number> = {
  ranger: 0,
  mage: 1,
  assassin: 1,
  support: 2,
  fighter: 3,
  tank: 4,
};

function getFrontlineSortPriority(heroClass: HeroClass): number {
  return FRONTLINE_SORT_PRIORITY[heroClass];
}

function getOwnedHeroIds(): Set<string> {
  const realm = loadCurrentRealm();
  return new Set(
    (realm?.ownedHeroes ?? [])
      .filter((hero) => hero.isOwned)
      .map((hero) => hero.heroId),
  );
}

function isFormationEmpty(formation: FormationGrid): boolean {
  return formation.slots.every((slot) => !slot.assignedHeroId);
}

function buildDefaultLineupSlots(): (string | null)[] {
  return [...DEFAULT_LINEUP_HERO_IDS];
}

function loadLineupFromCurrentFormation(): (string | null)[] {
  const realm = loadCurrentRealm();
  const ownedIds = getOwnedHeroIds();
  const formation = realm?.currentFormation;

  if (!formation?.slots?.length || isFormationEmpty(formation)) {
    return buildDefaultLineupSlots();
  }

  const slots: (string | null)[] = Array.from(
    { length: FORMATION.LINEUP_SLOT_COUNT },
    () => null,
  );

  for (const slot of formation.slots) {
    if (slot.slotIndex < 0 || slot.slotIndex >= FORMATION.LINEUP_SLOT_COUNT) continue;
    const heroId = slot.assignedHeroId;
    if (heroId && ownedIds.has(heroId)) {
      slots[slot.slotIndex] = heroId;
    }
  }

  const assignedCount = slots.filter((entry): entry is string => entry !== null).length;
  if (assignedCount === 0) {
    return buildDefaultLineupSlots();
  }

  return slots;
}

function persistCurrentFormation(lineupSlots: (string | null)[]): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const updatedSlots = realm.currentFormation.slots.map((slot) => ({
    ...slot,
    assignedHeroId: lineupSlots[slot.slotIndex] ?? null,
  }));

  saveCurrentRealm({
    ...realm,
    currentFormation: { slots: updatedSlots },
  });

  saveFormationSlots(lineupSlots);
}

function loadOwnedRosterHeroes(): RosterHero[] {
  const realm = loadCurrentRealm();
  const ownedIds = (realm?.ownedHeroes ?? [])
    .filter((hero) => hero.isOwned)
    .map((hero) => hero.heroId);

  return ownedIds.flatMap((heroId) => {
    const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
    if (!heroData) return [];
    return [{
      id: heroData.id,
      name: heroData.name,
      classLabel: heroData.title,
      color: heroData.color,
      heroClass: heroData.heroClass,
    }];
  });
}

function getNaturalRosterStripMetrics(count: number): {
  startX: number;
  spacing: number;
  contentWidth: number;
} {
  const spacing = UI.FORMATION_ROSTER_SPACING;
  const radius = UI.FORMATION_HERO_PREVIEW_RADIUS;
  const padding = 20;

  if (count <= 0) {
    return { startX: CANVAS.WIDTH / 2, spacing: 0, contentWidth: 0 };
  }

  if (count === 1) {
    return {
      startX: CANVAS.WIDTH / 2,
      spacing: 0,
      contentWidth: radius * 2 + padding * 2,
    };
  }

  const startX = padding + radius;
  return {
    startX,
    spacing,
    contentWidth: startX + (count - 1) * spacing + radius + padding,
  };
}

export class FormationScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.FORMATION;

  private stageId = 'stage_1_1';
  private arenaOpponentId: string | null = null;
  private voidTrialFloor: number | null = null;

  private lineupStage!: Phaser.GameObjects.Rectangle;
  private lineupTitle!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;
  private battleTapZone!: Phaser.GameObjects.Zone;

  private lineupSlots: (string | null)[] = [null, null, null, null];
  private rosterHeroes: RosterHero[] = [];
  private rosterScroll: HorizontalDragScroll | null = null;
  private presetToolbar: FormationPresetToolbar | null = null;
  private presetModal: HubOverlayPanel | null = null;
  private presetToastLabel: Phaser.GameObjects.Text | null = null;
  private presetToastTimer: Phaser.Time.TimerEvent | null = null;
  private selectedPresetId: string | null = null;
  private readonly lineupVisuals: LineupSlotVisual[] = [];
  private readonly rosterVisuals: RosterVisual[] = [];

  constructor() {
    super({ key: FormationScene.KEY });
  }

  init(data: {
    stageId?: string;
    origin?: string;
    arenaOpponentId?: string;
    voidTrialFloor?: number;
  }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
    this.arenaOpponentId = data.arenaOpponentId ?? null;
    this.voidTrialFloor = data.voidTrialFloor ?? null;
  }

  create(): void {
    // Guard: clear arrays in case shutdown() was not called before this create() re-runs
    this.lineupVisuals.length = 0;
    this.rosterVisuals.length = 0;

    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.lineupStage = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.BATTLE_HEIGHT,
      UI.FORMATION_LINEUP_STAGE_COLOR,
    );

    const stageName = this.stageId === 'arena'
      ? `Arena — ${getOpponentById(this.arenaOpponentId ?? '')?.displayName ?? 'Rival'}`
      : this.stageId === 'void_trial' && this.voidTrialFloor !== null
        ? `Void Trial — Floor ${this.voidTrialFloor}`
        : (getStageData(this.stageId)?.name ?? 'Stage');
    this.lineupTitle = this.add.text(
      CANVAS.WIDTH / 2,
      UI.FORMATION_LINEUP_TITLE_Y,
      `Team — ${stageName}`,
      {
        fontSize: '16px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.rosterHeroes = loadOwnedRosterHeroes();
    this.createLineupPlatforms();
    this.createRosterStrip();

    const battleY = CANVAS.BATTLE_HEIGHT / 2;
    this.battleButton = this.add.text(
      UI.FORMATION_BATTLE_BUTTON_X,
      battleY,
      '[ BATTLE ]',
      {
        fontSize: '20px',
        color: UI.FORMATION_BUTTON_DISABLED_COLOR,
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.battleTapZone = this.add.zone(
      UI.FORMATION_BATTLE_BUTTON_X,
      battleY,
      UI.SCENE_NAV_BUTTON_WIDTH,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );

    this.lineupSlots = loadLineupFromCurrentFormation();
    this.createPresetToolbar();
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  shutdown(): void {
    this.presetToastTimer?.remove();
    this.presetToastTimer = null;
    this.presetToastLabel?.destroy();
    this.presetToastLabel = null;

    this.presetModal?.close();
    this.presetModal?.destroy();
    this.presetModal = null;

    this.presetToolbar?.destroy();
    this.presetToolbar = null;

    this.battleTapZone?.off('pointerup', this.onBattle, this);
    this.battleTapZone?.destroy();

    for (const slot of this.lineupVisuals) {
      slot.heroTapZone?.off('pointerup');
      slot.platform.destroy();
      slot.heroCircle?.destroy();
      slot.heroName?.destroy();
      slot.heroTapZone?.destroy();
    }
    this.lineupVisuals.length = 0;

    for (const portrait of this.rosterVisuals) {
      portrait.tapZone.off('pointerup');
      portrait.tapZone.destroy();
      portrait.circle.destroy();
      portrait.label.destroy();
    }
    this.rosterVisuals.length = 0;

    this.rosterScroll?.destroy();
    this.rosterScroll = null;

    this.lineupStage?.destroy();
    this.lineupTitle?.destroy();
    this.battleButton?.destroy();
    this.rosterHeroes = [];
    this.selectedPresetId = null;
  }

  private createPresetToolbar(): void {
    this.presetToolbar = new FormationPresetToolbar(this, 50, {
      onSelectPreset: (presetId) => {
        this.selectedPresetId = presetId;
        this.refreshPresetToolbar();
      },
      onSave: () => this.openPresetNameModal('Save formation as:', (name) => this.handleSavePreset(name)),
      onLoad: () => this.handleLoadPreset(),
      onRename: () => this.openPresetNameModal('Rename preset to:', (name) => this.handleRenamePreset(name)),
      onDelete: () => this.openDeletePresetModal(),
    });
    this.refreshPresetToolbar();
  }

  private refreshPresetToolbar(): void {
    const save = this.loadSave();
    if (!save || !this.presetToolbar) return;

    if (this.selectedPresetId
      && !save.formationPresets.some((preset) => preset.id === this.selectedPresetId)) {
      this.selectedPresetId = null;
    }

    this.presetToolbar.refresh(save.formationPresets, this.selectedPresetId);
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
  }

  private openPresetNameModal(
    title: string,
    onPick: (name: string) => void,
  ): void {
    this.presetModal?.close();
    this.presetModal = new HubOverlayPanel(this);
    this.presetModal.open(title, () => this.presetModal?.close());

    PRESET_NAME_OPTIONS.forEach((name, index) => {
      const y = CANVAS.HEIGHT / 2 - 30 + index * 34;
      this.presetModal!.addButton(
        CANVAS.WIDTH / 2,
        y,
        name,
        () => {
          this.presetModal?.close();
          onPick(name);
        },
        220,
      );
    });
  }

  private openDeletePresetModal(): void {
    if (!this.selectedPresetId) return;

    const save = this.loadSave();
    const preset = save?.formationPresets.find((entry) => entry.id === this.selectedPresetId);
    if (!preset) return;

    this.presetModal?.close();
    this.presetModal = new HubOverlayPanel(this);
    this.presetModal.open('Delete preset?', () => this.presetModal?.close());
    this.presetModal.addText(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 20,
      `Delete "${preset.name}"? This cannot be undone.`,
      '#ffaaaa',
    );
    this.presetModal.addButton(
      CANVAS.WIDTH / 2 - 90,
      CANVAS.HEIGHT / 2 + 40,
      'CANCEL',
      () => this.presetModal?.close(),
      120,
    );
    this.presetModal.addButton(
      CANVAS.WIDTH / 2 + 90,
      CANVAS.HEIGHT / 2 + 40,
      'DELETE',
      () => {
        this.presetModal?.close();
        this.handleDeletePreset();
      },
      120,
    );
  }

  private handleSavePreset(name: string): void {
    persistCurrentFormation(this.lineupSlots);
    const save = this.loadSave();
    if (!save) return;

    const result = FormationPresetSystem.saveCurrentFormationAsPreset(save, name);
    if (!result.success) {
      this.showPresetToast(result.reason ?? 'Save failed');
      return;
    }

    saveCurrentRealm(save);
    this.selectedPresetId = result.preset?.id ?? null;
    this.refreshPresetToolbar();
    this.showPresetToast(`Saved "${name}"`);
  }

  private handleLoadPreset(): void {
    if (!this.selectedPresetId) {
      this.showPresetToast('Select a preset first');
      return;
    }

    const save = this.loadSave();
    if (!save) return;

    const result = FormationPresetSystem.loadPresetIntoCurrentFormation(save, this.selectedPresetId);
    if (!result.success) {
      this.showPresetToast(result.reason ?? 'Load failed');
      return;
    }

    saveCurrentRealm(save);
    saveFormationSlots(FormationPresetSystem.lineupSlotsFromFormation(save.currentFormation));
    this.reloadFormationFromSave();
    this.showPresetToast(`Loaded "${result.preset?.name ?? 'preset'}"`);
  }

  private handleRenamePreset(name: string): void {
    if (!this.selectedPresetId) return;

    const save = this.loadSave();
    if (!save) return;

    const result = FormationPresetSystem.renamePreset(save, this.selectedPresetId, name);
    if (!result.success) {
      this.showPresetToast(result.reason ?? 'Rename failed');
      return;
    }

    saveCurrentRealm(save);
    this.refreshPresetToolbar();
    this.showPresetToast(`Renamed to "${name}"`);
  }

  private handleDeletePreset(): void {
    if (!this.selectedPresetId) return;

    const save = this.loadSave();
    if (!save) return;

    const result = FormationPresetSystem.deletePreset(save, this.selectedPresetId);
    if (!result.success) {
      this.showPresetToast(result.reason ?? 'Delete failed');
      return;
    }

    saveCurrentRealm(save);
    this.selectedPresetId = null;
    this.refreshPresetToolbar();
    this.showPresetToast(`Deleted "${result.preset?.name ?? 'preset'}"`);
  }

  private reloadFormationFromSave(): void {
    this.lineupSlots = loadLineupFromCurrentFormation();
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  private showPresetToast(message: string): void {
    this.presetToastTimer?.remove();
    this.presetToastLabel?.destroy();

    this.presetToastLabel = this.add.text(CANVAS.WIDTH / 2, 24, message, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.presetToastTimer = this.time.delayedCall(2200, () => {
      this.presetToastLabel?.destroy();
      this.presetToastLabel = null;
      this.presetToastTimer = null;
    });
  }

  private buildRightAlignedLineup(selectedHeroIds: readonly string[]): (string | null)[] {
    const slots: (string | null)[] = Array.from(
      { length: FORMATION.LINEUP_SLOT_COUNT },
      () => null,
    );
    if (selectedHeroIds.length === 0) return slots;

    const sortedHeroIds = [...selectedHeroIds].sort((heroIdA, heroIdB) => {
      const heroA = this.rosterHeroes.find((entry) => entry.id === heroIdA);
      const heroB = this.rosterHeroes.find((entry) => entry.id === heroIdB);
      if (!heroA || !heroB) return 0;

      const priorityDelta = getFrontlineSortPriority(heroA.heroClass)
        - getFrontlineSortPriority(heroB.heroClass);
      if (priorityDelta !== 0) return priorityDelta;
      return heroIdA.localeCompare(heroIdB);
    });

    sortedHeroIds.forEach((heroId, index) => {
      const platformIndex = (FORMATION.LINEUP_SLOT_COUNT - sortedHeroIds.length) + index;
      slots[platformIndex] = heroId;
    });

    return slots;
  }

  private createLineupPlatforms(): void {
    FORMATION.LINEUP_SLOT_POSITIONS.forEach((slotPosition) => {
      const platform = this.add.rectangle(
        slotPosition.x,
        slotPosition.platformY,
        FORMATION.LINEUP_PLATFORM_WIDTH,
        FORMATION.LINEUP_PLATFORM_HEIGHT,
        UI.FORMATION_LINEUP_PLATFORM_COLOR,
      );

      this.lineupVisuals.push({ platform });
    });
  }

  private createRosterStrip(): void {
    const { startX, spacing, contentWidth } = getNaturalRosterStripMetrics(this.rosterHeroes.length);
    const rosterViewportX = 30;
    const rosterViewportWidth = CANVAS.WIDTH - 60;

    this.rosterScroll = new HorizontalDragScroll(
      this,
      rosterViewportX,
      UI.FORMATION_ROSTER_Y - 45,
      rosterViewportWidth,
      90,
    );
    this.rosterScroll.setContentWidth(contentWidth);

    this.rosterHeroes.forEach((hero, index) => {
      const x = this.rosterHeroes.length <= 1
        ? startX
        : startX + index * spacing;
      const y = UI.FORMATION_ROSTER_Y;

      const circle = this.add.circle(x, y, UI.FORMATION_HERO_PREVIEW_RADIUS, hero.color);
      const label = this.add.text(x, y + UI.FORMATION_HERO_PREVIEW_RADIUS + 4, hero.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const tapZone = this.add.zone(x, y, UI.FORMATION_HERO_PREVIEW_RADIUS * 2, 50);
      tapZone.setInteractive({ useHandCursor: true });
      tapZone.on('pointerup', () => {
        if (this.rosterScroll?.shouldConsumeTap()) return;
        this.onRosterTapped(hero.id);
      });

      this.rosterScroll!.container.add([circle, label, tapZone]);
      this.rosterVisuals.push({ circle, label, tapZone });
    });
  }

  private onRosterTapped(heroId: string): void {
    const selectedHeroIds = this.lineupSlots.filter((slot): slot is string => slot !== null);
    const isSelected = selectedHeroIds.includes(heroId);

    const nextSelectedHeroIds = isSelected
      ? selectedHeroIds.filter((id) => id !== heroId)
      : [...selectedHeroIds, heroId];

    this.applySelectedHeroIds(nextSelectedHeroIds);
  }

  private onLineupHeroTapped(heroId: string): void {
    const selectedHeroIds = this.lineupSlots.filter((slot): slot is string => slot !== null);
    if (!selectedHeroIds.includes(heroId)) return;

    this.applySelectedHeroIds(selectedHeroIds.filter((id) => id !== heroId));
  }

  private applySelectedHeroIds(selectedHeroIds: string[]): void {
    this.lineupSlots = this.buildRightAlignedLineup(selectedHeroIds);
    persistCurrentFormation(this.lineupSlots);
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  private refreshLineupVisuals(): void {
    this.lineupVisuals.forEach((visual, slotIndex) => {
      const heroId = this.lineupSlots[slotIndex];
      const slotPosition = FORMATION.LINEUP_SLOT_POSITIONS[slotIndex];
      const heroY = slotPosition.platformY + FORMATION.LINEUP_HERO_Y_OFFSET;

      visual.heroCircle?.destroy();
      visual.heroName?.destroy();
      visual.heroTapZone?.destroy();
      visual.heroCircle = undefined;
      visual.heroName = undefined;
      visual.heroTapZone = undefined;

      if (!heroId) return;

      const hero = this.rosterHeroes.find((entry) => entry.id === heroId);
      if (!hero) return;

      visual.heroCircle = this.add.circle(
        slotPosition.x,
        heroY,
        UI.FORMATION_HERO_PREVIEW_RADIUS,
        hero.color,
      );
      visual.heroName = this.add.text(slotPosition.x, heroY + 28, hero.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const tapZoneWidth = UI.FORMATION_HERO_PREVIEW_RADIUS * 2 + 20;
      const tapZoneHeight = UI.FORMATION_HERO_PREVIEW_RADIUS * 2 + 36;
      visual.heroTapZone = this.add.zone(
        slotPosition.x,
        heroY + 14,
        tapZoneWidth,
        tapZoneHeight,
      );
      visual.heroTapZone.setInteractive({ useHandCursor: true });
      visual.heroTapZone.on('pointerup', () => this.onLineupHeroTapped(heroId));
    });

    this.refreshRosterHighlights();
  }

  private refreshRosterHighlights(): void {
    this.rosterVisuals.forEach((portrait, index) => {
      const heroId = this.rosterHeroes[index]?.id;
      if (!heroId) return;
      const isSelected = this.lineupSlots.includes(heroId);
      portrait.circle.setAlpha(isSelected ? 1 : 0.55);
      portrait.label.setAlpha(isSelected ? 1 : 0.7);
    });
  }

  private updateBattleButton(): void {
    const filledIds = this.lineupSlots.filter((slot): slot is string => slot !== null);
    const lineupReady = filledIds.length === FORMATION.LINEUP_SLOT_COUNT
      && new Set(filledIds).size === FORMATION.LINEUP_SLOT_COUNT;

    this.battleTapZone.off('pointerup', this.onBattle, this);
    this.battleButton.setColor(
      lineupReady ? UI.FORMATION_BUTTON_ENABLED_COLOR : UI.FORMATION_BUTTON_DISABLED_COLOR,
    );

    if (lineupReady) {
      this.battleTapZone.setInteractive({ useHandCursor: true });
      this.battleTapZone.on('pointerup', this.onBattle, this);
    } else {
      this.battleTapZone.disableInteractive();
    }
  }

  private readonly onBattle = (): void => {
    const filledIds = this.lineupSlots.filter((slot): slot is string => slot !== null);
    if (filledIds.length !== FORMATION.LINEUP_SLOT_COUNT
      || new Set(filledIds).size !== FORMATION.LINEUP_SLOT_COUNT) {
      return;
    }

    persistCurrentFormation(this.lineupSlots);
    this.scene.start(SCENE_KEYS.BATTLE, {
      stageId: this.stageId,
      arenaOpponentId: this.arenaOpponentId ?? undefined,
      voidTrialFloor: this.voidTrialFloor ?? undefined,
    });
  };
}
