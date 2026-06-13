// src/scenes/FormationScene.ts
// V0.1: team lineup selection — tap roster heroes to toggle; right-aligned by frontline priority.

import Phaser from 'phaser';
import {
  CANVAS,
  FORMATION,
  HEROES,
  UI,
} from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getStageData } from '../systems/StageLoader';
import { loadFormationSlots, saveFormationSlots } from '../systems/SaveSystem';
import type { HeroClass } from '../types';

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

const ROSTER_HEROES: readonly RosterHero[] = [
  {
    id: HEROES.KAEL.ID,
    name: 'Kael',
    classLabel: 'Vanguard',
    color: HEROES.KAEL.COLOR,
    heroClass: 'tank',
  },
  {
    id: HEROES.SURA.ID,
    name: 'Sura',
    classLabel: 'Striker',
    color: HEROES.SURA.COLOR,
    heroClass: 'fighter',
  },
  {
    id: HEROES.MIRA.ID,
    name: 'Mira',
    classLabel: 'Healer',
    color: HEROES.MIRA.COLOR,
    heroClass: 'support',
  },
  {
    id: HEROES.NYRA.ID,
    name: 'Nyra',
    classLabel: 'Marksman',
    color: HEROES.NYRA.COLOR,
    heroClass: 'ranger',
  },
];

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

function buildRightAlignedLineup(selectedHeroIds: readonly string[]): (string | null)[] {
  const slots: (string | null)[] = Array.from(
    { length: FORMATION.LINEUP_SLOT_COUNT },
    () => null,
  );
  if (selectedHeroIds.length === 0) return slots;

  const sortedHeroIds = [...selectedHeroIds].sort((heroIdA, heroIdB) => {
    const heroA = ROSTER_HEROES.find((entry) => entry.id === heroIdA);
    const heroB = ROSTER_HEROES.find((entry) => entry.id === heroIdB);
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

function normalizeLineupSlots(slots: (string | null)[]): (string | null)[] {
  const selectedHeroIds = slots.filter((slot): slot is string => slot !== null);
  return buildRightAlignedLineup(selectedHeroIds);
}

export class FormationScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.FORMATION;

  private stageId = 'stage_1_1';

  private lineupStage!: Phaser.GameObjects.Rectangle;
  private lineupTitle!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;
  private battleTapZone!: Phaser.GameObjects.Zone;

  private lineupSlots: (string | null)[] = [null, null, null, null];
  private readonly lineupVisuals: LineupSlotVisual[] = [];
  private readonly rosterVisuals: RosterVisual[] = [];

  constructor() {
    super({ key: FormationScene.KEY });
  }

  init(data: { stageId?: string; origin?: string }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
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

    const stageName = getStageData(this.stageId)?.name ?? 'Stage';
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

    this.lineupSlots = normalizeLineupSlots(loadFormationSlots());
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  shutdown(): void {
    this.battleTapZone?.off('pointerup', this.onBattle, this);
    this.battleTapZone?.destroy();

    for (const slot of this.lineupVisuals) {
      slot.platform.destroy();
      slot.heroCircle?.destroy();
      slot.heroName?.destroy();
      slot.heroTapZone?.destroy();
    }
    this.lineupVisuals.length = 0;

    for (const portrait of this.rosterVisuals) {
      portrait.tapZone.destroy();
      portrait.circle.destroy();
      portrait.label.destroy();
    }
    this.rosterVisuals.length = 0;

    this.lineupStage?.destroy();
    this.lineupTitle?.destroy();
    this.battleButton?.destroy();
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
    ROSTER_HEROES.forEach((hero, index) => {
      const x = UI.FORMATION_ROSTER_START_X + index * UI.FORMATION_ROSTER_SPACING;
      const y = UI.FORMATION_ROSTER_Y;

      const circle = this.add.circle(x, y, UI.FORMATION_HERO_PREVIEW_RADIUS, hero.color);
      const label = this.add.text(x, y + UI.FORMATION_HERO_PREVIEW_RADIUS + 4, hero.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const tapZone = this.add.zone(x, y, UI.FORMATION_HERO_PREVIEW_RADIUS * 2, 50);
      tapZone.setInteractive({ useHandCursor: true });
      tapZone.on('pointerup', () => this.onRosterTapped(hero.id));

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
    this.lineupSlots = buildRightAlignedLineup(selectedHeroIds);
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

      const hero = ROSTER_HEROES.find((entry) => entry.id === heroId);
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
      const heroId = ROSTER_HEROES[index].id;
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

    saveFormationSlots(this.lineupSlots);
    this.scene.start(SCENE_KEYS.BATTLE, { stageId: this.stageId });
  };
}
