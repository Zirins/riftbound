// src/scenes/FormationScene.ts
// V0.1: team lineup selection — combat positions are assigned in battle.

import Phaser from 'phaser';
import {
  CANVAS,
  FORMATION,
  HEROES,
  STAGES,
  UI,
} from '../constants/gameConfig';
import { loadFormationSlots, saveFormationSlots } from '../systems/SaveSystem';
import { BattleScene } from './BattleScene';

interface RosterHero {
  id: string;
  name: string;
  classLabel: string;
  color: number;
}

interface LineupSlotVisual {
  platform: Phaser.GameObjects.Rectangle;
  heroCircle?: Phaser.GameObjects.Arc;
  heroName?: Phaser.GameObjects.Text;
  emptyLabel?: Phaser.GameObjects.Text;
  tapZone: Phaser.GameObjects.Zone;
}

interface RosterVisual {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  tapZone: Phaser.GameObjects.Zone;
}

const ROSTER_HEROES: readonly RosterHero[] = [
  { id: HEROES.KAEL.ID, name: 'Kael', classLabel: 'Vanguard', color: HEROES.KAEL.COLOR },
  { id: HEROES.SURA.ID, name: 'Sura', classLabel: 'Striker', color: HEROES.SURA.COLOR },
  { id: HEROES.MIRA.ID, name: 'Mira', classLabel: 'Healer', color: HEROES.MIRA.COLOR },
  { id: HEROES.NYRA.ID, name: 'Nyra', classLabel: 'Marksman', color: HEROES.NYRA.COLOR },
];

export class FormationScene extends Phaser.Scene {
  static readonly KEY = 'FormationScene';

  private lineupStage!: Phaser.GameObjects.Rectangle;
  private lineupTitle!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;

  private lineupSlots: (string | null)[] = [null, null, null, null];
  private activeSlotIndex: number | null = null;
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

    this.createLineupSlots();
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

    this.lineupSlots = [...loadFormationSlots()];
    this.activeSlotIndex = null;
    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  shutdown(): void {
    this.battleButton?.off('pointerup', this.onBattle, this);

    for (const slot of this.lineupVisuals) {
      slot.tapZone.destroy();
      slot.platform.destroy();
      slot.heroCircle?.destroy();
      slot.heroName?.destroy();
      slot.emptyLabel?.destroy();
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

  private createLineupSlots(): void {
    FORMATION.LINEUP_SLOT_POSITIONS.forEach((slotPosition, slotIndex) => {
      const platform = this.add.rectangle(
        slotPosition.x,
        slotPosition.platformY,
        FORMATION.LINEUP_PLATFORM_WIDTH,
        FORMATION.LINEUP_PLATFORM_HEIGHT,
        UI.FORMATION_LINEUP_PLATFORM_COLOR,
      );

      const heroY = slotPosition.platformY + FORMATION.LINEUP_HERO_Y_OFFSET;
      const tapZone = this.add.zone(
        slotPosition.x,
        heroY + FORMATION.LINEUP_TAP_ZONE_HEIGHT / 2,
        FORMATION.LINEUP_PLATFORM_WIDTH + 20,
        FORMATION.LINEUP_TAP_ZONE_HEIGHT,
      );
      tapZone.setInteractive({ useHandCursor: true });
      tapZone.on('pointerup', () => this.onLineupSlotTapped(slotIndex));

      this.lineupVisuals.push({ platform, tapZone });
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

  private onLineupSlotTapped(slotIndex: number): void {
    if (this.activeSlotIndex === slotIndex && this.lineupSlots[slotIndex] !== null) {
      this.lineupSlots[slotIndex] = null;
      this.activeSlotIndex = slotIndex;
      this.refreshLineupVisuals();
      this.updateBattleButton();
      return;
    }

    this.activeSlotIndex = slotIndex;
    this.refreshLineupVisuals();
  }

  private onRosterTapped(heroId: string): void {
    if (this.activeSlotIndex === null) return;

    const existingSlot = this.lineupSlots.indexOf(heroId);
    if (existingSlot === this.activeSlotIndex) {
      this.lineupSlots[existingSlot] = null;
    } else {
      if (existingSlot !== -1) {
        this.lineupSlots[existingSlot] = null;
      }
      this.lineupSlots[this.activeSlotIndex] = heroId;
    }

    this.refreshLineupVisuals();
    this.updateBattleButton();
  }

  private refreshLineupVisuals(): void {
    this.lineupVisuals.forEach((visual, slotIndex) => {
      const heroId = this.lineupSlots[slotIndex];
      const isActive = this.activeSlotIndex === slotIndex;
      const slotPosition = FORMATION.LINEUP_SLOT_POSITIONS[slotIndex];
      const heroY = slotPosition.platformY + FORMATION.LINEUP_HERO_Y_OFFSET;

      visual.platform.setFillStyle(
        isActive ? UI.FORMATION_LINEUP_PLATFORM_ACTIVE_COLOR : UI.FORMATION_LINEUP_PLATFORM_COLOR,
      );

      visual.heroCircle?.destroy();
      visual.heroName?.destroy();
      visual.emptyLabel?.destroy();
      visual.heroCircle = undefined;
      visual.heroName = undefined;
      visual.emptyLabel = undefined;

      if (!heroId) {
        visual.emptyLabel = this.add.text(slotPosition.x, heroY + 8, '+', {
          fontSize: '28px',
          color: '#888899',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        return;
      }

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
