// src/scenes/FormationScene.ts
// V0.1: team lineup selection — tap roster heroes to toggle; class order for display.

import Phaser from 'phaser';
import {
  CANVAS,
  FORMATION,
  HEROES,
  STAGES,
  UI,
} from '../constants/gameConfig';
import { loadFormationSlots, saveFormationSlots } from '../systems/SaveSystem';
import type { HeroClass } from '../types';
import { BattleScene } from './BattleScene';

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

function getLineupSlotForClass(heroClass: HeroClass): number {
  const classOrder = FORMATION.LINEUP_CLASS_SLOT_ORDER as readonly HeroClass[];
  return classOrder.indexOf(heroClass);
}

function normalizeLineupSlots(slots: (string | null)[]): (string | null)[] {
  const normalized: (string | null)[] = Array.from(
    { length: FORMATION.LINEUP_SLOT_COUNT },
    () => null,
  );

  for (const heroId of slots) {
    if (!heroId) continue;
    const hero = ROSTER_HEROES.find((entry) => entry.id === heroId);
    if (!hero) continue;

    const slotIndex = getLineupSlotForClass(hero.heroClass);
    if (slotIndex === -1) continue;
    normalized[slotIndex] = heroId;
  }

  return normalized;
}

export class FormationScene extends Phaser.Scene {
  static readonly KEY = 'FormationScene';

  private lineupStage!: Phaser.GameObjects.Rectangle;
  private lineupTitle!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;

  private lineupSlots: (string | null)[] = [null, null, null, null];
  private readonly lineupVisuals: LineupSlotVisual[] = [];
  private readonly rosterVisuals: RosterVisual[] = [];

  constructor() {
    super({ key: FormationScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.lineupStage = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.BATTLE_HEIGHT,
      UI.FORMATION_LINEUP_STAGE_COLOR,
    );

    this.lineupTitle = this.add.text(
      CANVAS.WIDTH / 2,
      UI.FORMATION_LINEUP_TITLE_Y,
      `Team — ${STAGES.STAGE_1.DISPLAY_NAME}`,
      {
        fontSize: '16px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.createLineupPlatforms();
    this.createRosterStrip();

    this.battleButton = this.add.text(
      UI.FORMATION_BATTLE_BUTTON_X,
      CANVAS.BATTLE_HEIGHT / 2,
      '[ BATTLE ]',
      {
        fontSize: '20px',
        color: UI.FORMATION_BUTTON_DISABLED_COLOR,
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.lineupSlots = normalizeLineupSlots(loadFormationSlots());
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  shutdown(): void {
    this.battleButton?.off('pointerup', this.onBattle, this);

    for (const slot of this.lineupVisuals) {
      slot.platform.destroy();
      slot.heroCircle?.destroy();
      slot.heroName?.destroy();
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
    const hero = ROSTER_HEROES.find((entry) => entry.id === heroId);
    if (!hero) return;

    const slotIndex = getLineupSlotForClass(hero.heroClass);
    if (slotIndex === -1) return;

    if (this.lineupSlots[slotIndex] === heroId) {
      this.lineupSlots[slotIndex] = null;
    } else {
      this.lineupSlots[slotIndex] = heroId;
    }

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
      visual.heroCircle = undefined;
      visual.heroName = undefined;

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

    this.battleButton.off('pointerup', this.onBattle, this);
    this.battleButton.setColor(
      lineupReady ? UI.FORMATION_BUTTON_ENABLED_COLOR : UI.FORMATION_BUTTON_DISABLED_COLOR,
    );

    if (lineupReady) {
      this.battleButton.setInteractive({ useHandCursor: true });
      this.battleButton.on('pointerup', this.onBattle, this);
    } else {
      this.battleButton.disableInteractive();
    }
  }

  private readonly onBattle = (): void => {
    const filledIds = this.lineupSlots.filter((slot): slot is string => slot !== null);
    if (filledIds.length !== FORMATION.LINEUP_SLOT_COUNT
      || new Set(filledIds).size !== FORMATION.LINEUP_SLOT_COUNT) {
      return;
    }

    saveFormationSlots(this.lineupSlots);
    this.scene.start(BattleScene.KEY);
  };
}
