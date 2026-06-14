// src/ui/FormationPresetToolbar.ts
// Preset chips and actions for FormationScene.

import Phaser from 'phaser';
import { FORMATION_PRESETS } from '../constants/gameConfig';
import type { FormationPreset } from '../types';
import { ButtonPrimary } from './ButtonPrimary';

const CHIP_WIDTH = 108;
const CHIP_HEIGHT = 24;
const CHIP_GAP = 6;
const START_X = 40;

interface PresetChipUi {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  presetId: string;
}

export interface FormationPresetToolbarHandlers {
  onSelectPreset: (presetId: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export class FormationPresetToolbar {
  private readonly headerLabel: Phaser.GameObjects.Text;
  private readonly chips: PresetChipUi[] = [];
  private readonly saveButton: ButtonPrimary;
  private readonly loadButton: ButtonPrimary;
  private readonly renameButton: ButtonPrimary;
  private readonly deleteButton: ButtonPrimary;

  constructor(
    private readonly scene: Phaser.Scene,
    originY: number,
    private readonly handlers: FormationPresetToolbarHandlers,
  ) {
    this.headerLabel = scene.add.text(START_X, originY, 'PRESETS', {
      fontSize: '9px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    const actionY = originY + 34;
    this.saveButton = new ButtonPrimary(
      scene,
      START_X + 52,
      actionY,
      'SAVE',
      handlers.onSave,
      88,
      30,
    );
    this.loadButton = new ButtonPrimary(
      scene,
      START_X + 148,
      actionY,
      'LOAD',
      handlers.onLoad,
      88,
      30,
    );
    this.renameButton = new ButtonPrimary(
      scene,
      START_X + 244,
      actionY,
      'RENAME',
      handlers.onRename,
      96,
      30,
    );
    this.deleteButton = new ButtonPrimary(
      scene,
      START_X + 348,
      actionY,
      'DELETE',
      handlers.onDelete,
      96,
      30,
    );
  }

  refresh(presets: FormationPreset[], selectedPresetId: string | null): void {
    this.clearChips();

    const chipY = this.headerLabel.y + 14;
    for (let index = 0; index < FORMATION_PRESETS.MAX_PRESETS; index += 1) {
      const preset = presets[index];
      const x = START_X + index * (CHIP_WIDTH + CHIP_GAP) + CHIP_WIDTH / 2;
      const isSelected = preset?.id === selectedPresetId;
      const labelText = preset
        ? this.truncatePresetName(preset.name)
        : `Slot ${index + 1}`;

      const bg = this.scene.add.rectangle(
        x,
        chipY,
        CHIP_WIDTH,
        CHIP_HEIGHT,
        preset ? (isSelected ? 0x334466 : 0x222233) : 0x1a1a2e,
      ).setStrokeStyle(1, preset ? (isSelected ? 0x6688aa : 0x444466) : 0x333344);

      const label = this.scene.add.text(x, chipY, labelText, {
        fontSize: '8px',
        color: preset ? (isSelected ? '#ffffff' : '#ccccdd') : '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.scene.add.zone(x, chipY, CHIP_WIDTH, CHIP_HEIGHT);
      if (preset) {
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => this.handlers.onSelectPreset(preset.id));
      }

      this.chips.push({
        bg,
        label,
        zone,
        presetId: preset?.id ?? '',
      });
    }

    const hasSelection = !!selectedPresetId
      && presets.some((preset) => preset.id === selectedPresetId);
    this.loadButton.setEnabled(hasSelection);
    this.renameButton.setEnabled(hasSelection);
    this.deleteButton.setEnabled(hasSelection);
  }

  destroy(): void {
    this.clearChips();
    this.headerLabel.destroy();
    this.saveButton.destroy();
    this.loadButton.destroy();
    this.renameButton.destroy();
    this.deleteButton.destroy();
  }

  private clearChips(): void {
    for (const chip of this.chips) {
      chip.zone.removeAllListeners();
      chip.zone.destroy();
      chip.bg.destroy();
      chip.label.destroy();
    }
    this.chips.length = 0;
  }

  private truncatePresetName(name: string): string {
    return name.length > 14 ? `${name.slice(0, 13)}…` : name;
  }
}
