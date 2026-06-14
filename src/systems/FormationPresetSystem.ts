// src/systems/FormationPresetSystem.ts
// Saved formation presets — save, load, rename, delete (Section 17).

import { FORMATION_PRESETS, FORMATION } from '../constants/gameConfig';
import type {
  FormationGrid,
  FormationPreset,
  FormationPresetResult,
  FormationSlot,
  RealmSaveDataV3,
} from '../types';

export const PRESET_NAME_OPTIONS = [
  'Arena Squad',
  'Campaign Squad',
  'Boss Squad',
  'Custom Squad',
] as const;

export type PresetNameOption = typeof PRESET_NAME_OPTIONS[number];

export class FormationPresetSystem {
  static listPresets(save: RealmSaveDataV3): FormationPreset[] {
    return [...save.formationPresets];
  }

  static getPreset(save: RealmSaveDataV3, presetId: string): FormationPreset | null {
    return save.formationPresets.find((preset) => preset.id === presetId) ?? null;
  }

  static canCreatePreset(save: RealmSaveDataV3): boolean {
    return save.formationPresets.length < FORMATION_PRESETS.MAX_PRESETS;
  }

  static saveCurrentFormationAsPreset(
    save: RealmSaveDataV3,
    name: string,
    mode?: FormationPreset['mode'],
  ): FormationPresetResult {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, reason: 'Preset name is required' };
    }

    const slots = FormationPresetSystem.cloneFormationSlots(save.currentFormation);
    const now = new Date().toISOString();
    const resolvedMode = mode ?? FormationPresetSystem.inferModeFromName(trimmedName);
    const existing = save.formationPresets.find((preset) => preset.name === trimmedName);

    if (existing) {
      existing.slots = slots;
      existing.updatedAt = now;
      existing.mode = resolvedMode;
      return { success: true, preset: existing };
    }

    if (!FormationPresetSystem.canCreatePreset(save)) {
      return { success: false, reason: `Maximum ${FORMATION_PRESETS.MAX_PRESETS} presets reached` };
    }

    const preset: FormationPreset = {
      id: FormationPresetSystem.createPresetId(save),
      name: trimmedName,
      mode: resolvedMode,
      slots,
      createdAt: now,
      updatedAt: now,
    };
    save.formationPresets.push(preset);
    return { success: true, preset };
  }

  static loadPresetIntoCurrentFormation(
    save: RealmSaveDataV3,
    presetId: string,
  ): FormationPresetResult {
    const preset = FormationPresetSystem.getPreset(save, presetId);
    if (!preset) {
      return { success: false, reason: 'Preset not found' };
    }

    save.currentFormation = {
      slots: FormationPresetSystem.sanitizeSlots(save, preset.slots),
    };

    return { success: true, preset };
  }

  static renamePreset(
    save: RealmSaveDataV3,
    presetId: string,
    newName: string,
  ): FormationPresetResult {
    const preset = FormationPresetSystem.getPreset(save, presetId);
    if (!preset) {
      return { success: false, reason: 'Preset not found' };
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      return { success: false, reason: 'Preset name is required' };
    }

    const duplicate = save.formationPresets.find(
      (entry) => entry.name === trimmedName && entry.id !== presetId,
    );
    if (duplicate) {
      return { success: false, reason: 'A preset with that name already exists' };
    }

    preset.name = trimmedName;
    preset.mode = FormationPresetSystem.inferModeFromName(trimmedName);
    preset.updatedAt = new Date().toISOString();
    return { success: true, preset };
  }

  static deletePreset(save: RealmSaveDataV3, presetId: string): FormationPresetResult {
    const index = save.formationPresets.findIndex((preset) => preset.id === presetId);
    if (index < 0) {
      return { success: false, reason: 'Preset not found' };
    }

    const [removed] = save.formationPresets.splice(index, 1);
    return { success: true, preset: removed };
  }

  static lineupSlotsFromFormation(formation: FormationGrid): (string | null)[] {
    const slots: (string | null)[] = Array.from(
      { length: FORMATION.LINEUP_SLOT_COUNT },
      () => null,
    );
    for (const slot of formation.slots) {
      if (slot.slotIndex >= 0 && slot.slotIndex < slots.length) {
        slots[slot.slotIndex] = slot.assignedHeroId;
      }
    }
    return slots;
  }

  private static createPresetId(save: RealmSaveDataV3): string {
    return `preset_${save.formationPresets.length + 1}_${Date.now()}`;
  }

  private static cloneFormationSlots(formation: FormationGrid): FormationSlot[] {
    return formation.slots.map((slot) => ({ ...slot }));
  }

  private static sanitizeSlots(
    save: RealmSaveDataV3,
    slots: FormationSlot[],
  ): FormationSlot[] {
    const ownedIds = new Set(
      save.ownedHeroes.filter((hero) => hero.isOwned).map((hero) => hero.heroId),
    );

    return slots.map((slot) => ({
      ...slot,
      assignedHeroId: slot.assignedHeroId && ownedIds.has(slot.assignedHeroId)
        ? slot.assignedHeroId
        : null,
    }));
  }

  private static inferModeFromName(name: string): FormationPreset['mode'] {
    const lower = name.toLowerCase();
    if (lower.includes('arena')) return 'arena';
    if (lower.includes('boss')) return 'boss';
    if (lower.includes('campaign')) return 'campaign';
    return 'custom';
  }
}
