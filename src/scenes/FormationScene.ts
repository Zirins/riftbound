// src/scenes/FormationScene.ts
// V0.1: 2×2 formation grid, hero assignment, Battle button.

import Phaser from 'phaser';
import {
  CANVAS,
  ENEMIES,
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

interface SlotVisual {
  panel: Phaser.GameObjects.Rectangle;
  rowLabel: Phaser.GameObjects.Text;
  heroCircle?: Phaser.GameObjects.Arc;
  heroName?: Phaser.GameObjects.Text;
  classLabel?: Phaser.GameObjects.Text;
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

  private battlefieldPreview!: Phaser.GameObjects.Rectangle;
  private stageEnemiesLabel!: Phaser.GameObjects.Text;
  private battleButton!: Phaser.GameObjects.Text;

  private slotAssignments: (string | null)[] = [null, null, null, null];
  private activeSlotIndex: number | null = null;
  private readonly slotVisuals: SlotVisual[] = [];
  private readonly rosterVisuals: RosterVisual[] = [];

  constructor() {
    super({ key: FormationScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.battlefieldPreview = this.add.rectangle(
      CANVAS.WIDTH / 4,
      CANVAS.BATTLE_HEIGHT / 2,
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT,
      UI.FORMATION_BATTLEFIELD_PREVIEW,
    );

    this.createEnemyPreview();
    this.createFormationSlots();
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

    this.slotAssignments = [...loadFormationSlots()];
    this.activeSlotIndex = null;
    this.refreshAllVisuals();
    this.updateBattleButton();
  }

  shutdown(): void {
    this.battleButton?.off('pointerup', this.onBattle, this);

    for (const slot of this.slotVisuals) {
      slot.tapZone.destroy();
      slot.panel.destroy();
      slot.rowLabel.destroy();
      slot.heroCircle?.destroy();
      slot.heroName?.destroy();
      slot.classLabel?.destroy();
      slot.emptyLabel?.destroy();
    }
    this.slotVisuals.length = 0;

    for (const portrait of this.rosterVisuals) {
      portrait.tapZone.destroy();
      portrait.circle.destroy();
      portrait.label.destroy();
    }
    this.rosterVisuals.length = 0;

    this.battlefieldPreview?.destroy();
    this.stageEnemiesLabel?.destroy();
    this.battleButton?.destroy();
  }

  private createEnemyPreview(): void {
    this.stageEnemiesLabel = this.add.text(
      CANVAS.WIDTH * 0.75,
      UI.WAVE_LABEL_Y,
      `${STAGES.STAGE_1.DISPLAY_NAME} Enemies`,
      {
        fontSize: '14px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5, 0);

    for (const position of FORMATION.ENEMY_PREVIEW_POSITIONS) {
      this.add.circle(
        position.x,
        position.y,
        ENEMIES.GRUNT.RADIUS,
        UI.FORMATION_ENEMY_PREVIEW_COLOR,
      );
    }
  }

  private createFormationSlots(): void {
    FORMATION.SLOT_UI.forEach((slotUi, slotIndex) => {
      const centerX = slotUi.x + FORMATION.SLOT_WIDTH / 2;
      const centerY = slotUi.y + FORMATION.SLOT_HEIGHT / 2;

      const panel = this.add.rectangle(
        centerX,
        centerY,
        FORMATION.SLOT_WIDTH,
        FORMATION.SLOT_HEIGHT,
        UI.BACKGROUND_COLOR,
        0.35,
      );
      panel.setStrokeStyle(2, UI.FORMATION_SLOT_EMPTY_BORDER);

      const rowLabel = this.add.text(
        centerX,
        slotUi.y + 8,
        slotUi.rowLabel,
        {
          fontSize: '11px',
          color: '#888899',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5, 0);

      const tapZone = this.add.zone(centerX, centerY, FORMATION.SLOT_WIDTH, FORMATION.SLOT_HEIGHT);
      tapZone.setInteractive({ useHandCursor: true });
      tapZone.on('pointerup', () => this.onSlotTapped(slotIndex));

      this.slotVisuals.push({ panel, rowLabel, tapZone });
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

  private onSlotTapped(slotIndex: number): void {
    if (this.activeSlotIndex === slotIndex && this.slotAssignments[slotIndex] !== null) {
      this.slotAssignments[slotIndex] = null;
      this.activeSlotIndex = slotIndex;
      this.refreshAllVisuals();
      this.updateBattleButton();
      return;
    }

    this.activeSlotIndex = slotIndex;
    this.refreshAllVisuals();
  }

  private onRosterTapped(heroId: string): void {
    if (this.activeSlotIndex === null) return;

    const existingSlot = this.slotAssignments.indexOf(heroId);
    if (existingSlot === this.activeSlotIndex) {
      this.slotAssignments[existingSlot] = null;
    } else {
      if (existingSlot !== -1) {
        this.slotAssignments[existingSlot] = null;
      }
      this.slotAssignments[this.activeSlotIndex] = heroId;
    }

    this.refreshAllVisuals();
    this.updateBattleButton();
  }

  private refreshAllVisuals(): void {
    this.slotVisuals.forEach((visual, slotIndex) => {
      const heroId = this.slotAssignments[slotIndex];
      const isActive = this.activeSlotIndex === slotIndex;
      const centerX = visual.panel.x;
      const centerY = visual.panel.y;

      visual.panel.setStrokeStyle(
        2,
        isActive ? UI.FORMATION_SLOT_ACTIVE_BORDER : UI.FORMATION_SLOT_EMPTY_BORDER,
      );

      visual.heroCircle?.destroy();
      visual.heroName?.destroy();
      visual.classLabel?.destroy();
      visual.emptyLabel?.destroy();
      visual.heroCircle = undefined;
      visual.heroName = undefined;
      visual.classLabel = undefined;
      visual.emptyLabel = undefined;

      if (!heroId) {
        visual.emptyLabel = this.add.text(centerX, centerY, 'Empty', {
          fontSize: '14px',
          color: '#888899',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        return;
      }

      const hero = ROSTER_HEROES.find((entry) => entry.id === heroId);
      if (!hero) return;

      visual.heroCircle = this.add.circle(
        centerX,
        centerY - 10,
        UI.FORMATION_HERO_PREVIEW_RADIUS,
        hero.color,
      );
      visual.heroName = this.add.text(centerX, centerY + 10, hero.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      visual.classLabel = this.add.text(centerX, centerY + 26, hero.classLabel, {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });
  }

  private updateBattleButton(): void {
    const allFilled = this.slotAssignments.every((slot) => slot !== null);

    this.battleButton.off('pointerup', this.onBattle, this);
    this.battleButton.setColor(
      allFilled ? UI.FORMATION_BUTTON_ENABLED_COLOR : UI.FORMATION_BUTTON_DISABLED_COLOR,
    );

    if (allFilled) {
      this.battleButton.setInteractive({ useHandCursor: true });
      this.battleButton.on('pointerup', this.onBattle, this);
    } else {
      this.battleButton.disableInteractive();
    }
  }

  private readonly onBattle = (): void => {
    if (!this.slotAssignments.every((slot) => slot !== null)) return;

    saveFormationSlots(this.slotAssignments);
    this.scene.start(BattleScene.KEY);
  };
}
