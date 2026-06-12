// src/systems/SaveMigrationSystem.ts
// One-time migration from V0.1 localStorage keys to V1.1 SaveRoot schema.

import { buildDefaultSaveRoot, saveRoot } from './SaveSystem';
import type { FormationGrid } from '../types';

const SAVE_ROOT_KEY = 'riftbound_save_root';
const V01_FORMATION_KEY = 'riftbound_mvp_formation';
const V01_SETTINGS_KEY = 'riftbound_settings';
const DEFAULT_REALM_ID = 'ironreach';

export function migrate(): void {
  const root = localStorage.getItem(SAVE_ROOT_KEY);
  if (root) return;

  const formationJson = localStorage.getItem(V01_FORMATION_KEY);
  const settingsJson = localStorage.getItem(V01_SETTINGS_KEY);

  if (!formationJson && !settingsJson) return;

  const formation = parseV01Formation(formationJson);
  const settings = parseV01Settings(settingsJson);

  const migratedSave = buildDefaultSaveRoot(DEFAULT_REALM_ID, 'Relic Bearer');
  migratedSave.realms[DEFAULT_REALM_ID].currentFormation = formation;
  migratedSave.realms[DEFAULT_REALM_ID].arenaState.defenseFormation = formation;
  migratedSave.realms[DEFAULT_REALM_ID].settings = settings;
  migratedSave.selectedRealmId = DEFAULT_REALM_ID;

  saveRoot(migratedSave);
  localStorage.removeItem(V01_FORMATION_KEY);
  localStorage.removeItem(V01_SETTINGS_KEY);
}

function parseV01Formation(formationJson: string | null): FormationGrid {
  const defaultHeroIds = ['kael', 'sura', 'mira', 'nyra'];
  const rows = ['front', 'front', 'back', 'back'] as const;
  const cols = [0, 1, 0, 1];

  if (!formationJson) {
    return buildFormationGridFromHeroIds(defaultHeroIds);
  }

  try {
    const parsed: unknown = JSON.parse(formationJson);
    if (!Array.isArray(parsed) || parsed.length !== 4) {
      return buildFormationGridFromHeroIds(defaultHeroIds);
    }

    const heroIds = parsed.map((entry) => (
      typeof entry === 'string' && entry.length > 0 ? entry : null
    ));

    return {
      slots: heroIds.map((heroId, slotIndex) => ({
        slotIndex,
        row: rows[slotIndex],
        col: cols[slotIndex],
        assignedHeroId: heroId,
      })),
    };
  } catch {
    return buildFormationGridFromHeroIds(defaultHeroIds);
  }
}

function buildFormationGridFromHeroIds(heroIds: string[]): FormationGrid {
  const rows = ['front', 'front', 'back', 'back'] as const;
  const cols = [0, 1, 0, 1];

  return {
    slots: heroIds.map((heroId, slotIndex) => ({
      slotIndex,
      row: rows[slotIndex],
      col: cols[slotIndex],
      assignedHeroId: heroId,
    })),
  };
}

function parseV01Settings(settingsJson: string | null): {
  musicVolume: number;
  sfxVolume: number;
  defaultAutoUltimate: boolean;
} {
  const defaults = { musicVolume: 80, sfxVolume: 80, defaultAutoUltimate: false };

  if (!settingsJson) return defaults;

  try {
    const parsed: unknown = JSON.parse(settingsJson);
    if (typeof parsed !== 'object' || parsed === null) return defaults;

    const record = parsed as Record<string, unknown>;
    const soundMuted = record.soundMuted === true;

    return {
      musicVolume: typeof record.musicVolume === 'number'
        ? record.musicVolume
        : (soundMuted ? 0 : 80),
      sfxVolume: typeof record.sfxVolume === 'number'
        ? record.sfxVolume
        : (soundMuted ? 0 : 80),
      defaultAutoUltimate: typeof record.defaultAutoUltimate === 'boolean'
        ? record.defaultAutoUltimate
        : false,
    };
  } catch {
    return defaults;
  }
}
