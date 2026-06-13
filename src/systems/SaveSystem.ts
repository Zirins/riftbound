// src/systems/SaveSystem.ts
// V0.1: localStorage team lineup + settings.
// V1.1: SaveRoot schema via riftbound_save_root.
// V2: schema 3 realm fields via migrateSaveV2ToV3 on load.

import { HEROES, SAVE_SCHEMA } from '../constants/gameConfig';
import { buildDefaultRealmV3 } from '../save/defaults/buildDefaultRealmV3';
import {
  migrateSaveV2ToV3,
  realmNeedsV3Migration,
} from '../save/migrations/migrateSaveV2ToV3';
import type {
  RealmSaveData,
  SaveRoot,
} from '../types';

const STORAGE_KEY = 'riftbound_mvp_formation';
const SETTINGS_KEY = 'riftbound_settings';
const SAVE_ROOT_KEY = 'riftbound_save_root';
const SAVE_ROOT_BACKUP_V2_KEY = 'riftbound_save_root_backup_v2';
const SCHEMA_VERSION = SAVE_SCHEMA.V2;

const DEFAULT_LINEUP_HERO_IDS: readonly string[] = [
  HEROES.KAEL.ID,
  HEROES.SURA.ID,
  HEROES.MIRA.ID,
  HEROES.NYRA.ID,
];

const MVP_HERO_IDS = new Set(DEFAULT_LINEUP_HERO_IDS);
const SLOT_COUNT = 4;

export type FormationSlotSave = string | null;

export interface GameSettings {
  soundMuted: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundMuted: false,
};

const EMPTY_LINEUP: FormationSlotSave[] = [null, null, null, null];

/** Loads saved team lineup — order is roster selection only, not combat position. */
export function loadFormationSlots(): FormationSlotSave[] {
  const saved = readSavedSlotsRaw();
  if (!saved) return [...DEFAULT_LINEUP_HERO_IDS];

  return saved.map((entry) => (
    typeof entry === 'string' && entry.length > 0 && MVP_HERO_IDS.has(entry) ? entry : null
  ));
}

/** Persists the current team lineup (may include nulls while editing). */
export function saveFormationSlots(slots: FormationSlotSave[]): void {
  if (slots.length !== SLOT_COUNT) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

/** Returns selected hero IDs for battle — display slot order is ignored. */
export function getBattleLineupHeroIds(): readonly string[] {
  const slots = loadFormationSlots();
  const heroIds = slots.filter((slot): slot is string => slot !== null);

  if (heroIds.length === SLOT_COUNT && isValidMvpLineup(heroIds)) {
    return heroIds;
  }

  writeDefaultLineup();
  return DEFAULT_LINEUP_HERO_IDS;
}

/** @deprecated Use getBattleLineupHeroIds — saved slot indices are not combat positions. */
export function getBattleFormationSlots(): readonly string[] {
  return getBattleLineupHeroIds();
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'soundMuted' in parsed
      && typeof (parsed as GameSettings).soundMuted === 'boolean'
    ) {
      return { soundMuted: (parsed as GameSettings).soundMuted };
    }
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Clears saved lineup so the player can pick a new team. */
export function clearFormation(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...EMPTY_LINEUP]));
}

// ─── V1.1 SaveRoot API ────────────────────────────────────────────────────────

export function loadRoot(): SaveRoot | null {
  try {
    const raw = localStorage.getItem(SAVE_ROOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSaveRoot(parsed)) return null;
    return ensureRootMigrated(parsed);
  } catch {
    return null;
  }
}

/** True when save was written by a newer client — do not overwrite. */
export function isUnsupportedSaveVersion(root: SaveRoot | null): boolean {
  return root !== null && root.schemaVersion > SAVE_SCHEMA.V2;
}

export function getSupportedSchemaVersion(): number {
  return SAVE_SCHEMA.V2;
}

export function saveRoot(root: SaveRoot): void {
  localStorage.setItem(SAVE_ROOT_KEY, JSON.stringify(root));
}

export function loadCurrentRealm(): RealmSaveData | null {
  const root = loadRoot();
  if (!root?.selectedRealmId) return null;
  return root.realms[root.selectedRealmId] ?? null;
}

export function saveCurrentRealm(data: RealmSaveData): void {
  const root = loadRoot();
  if (!root) return;

  root.realms[data.realmId] = { ...data, lastSaved: Date.now() };
  root.selectedRealmId = data.realmId;
  saveRoot(root);
}

export function hasAnySave(): boolean {
  const root = loadRoot();
  return root !== null && Object.keys(root.realms).length > 0;
}

export function buildDefaultSaveRoot(realmId: string, playerName: string): SaveRoot {
  const realm = buildDefaultRealmV3(realmId, playerName);

  return {
    schemaVersion: SCHEMA_VERSION,
    realms: { [realmId]: realm },
    selectedRealmId: realmId,
  };
}

function ensureRootMigrated(root: SaveRoot): SaveRoot {
  if (root.schemaVersion > SAVE_SCHEMA.V2) {
    return root;
  }

  const needsSchemaBump = root.schemaVersion < SAVE_SCHEMA.V2;
  const needsRealmPatch = Object.values(root.realms).some(realmNeedsV3Migration);

  if (!needsSchemaBump && !needsRealmPatch) {
    return root;
  }

  if (needsSchemaBump) {
    backupSaveBeforeV3Migration(root);
  }

  const migratedRealms: Record<string, RealmSaveData> = {};
  for (const [realmId, realm] of Object.entries(root.realms)) {
    migratedRealms[realmId] = migrateSaveV2ToV3(realm);
  }

  const migrated: SaveRoot = {
    ...root,
    schemaVersion: SAVE_SCHEMA.V2,
    realms: migratedRealms,
  };

  saveRoot(migrated);
  return migrated;
}

function backupSaveBeforeV3Migration(root: SaveRoot): void {
  if (localStorage.getItem(SAVE_ROOT_BACKUP_V2_KEY)) return;
  localStorage.setItem(SAVE_ROOT_BACKUP_V2_KEY, JSON.stringify(root));
}

function isSaveRoot(value: unknown): value is SaveRoot {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.schemaVersion === 'number'
    && typeof record.realms === 'object'
    && record.realms !== null
    && (typeof record.selectedRealmId === 'string' || record.selectedRealmId === null)
  );
}

function readSavedSlotsRaw(): unknown[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== SLOT_COUNT) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isValidMvpLineup(slots: string[]): boolean {
  const seen = new Set<string>();
  for (const heroId of slots) {
    if (!MVP_HERO_IDS.has(heroId) || seen.has(heroId)) return false;
    seen.add(heroId);
  }
  return seen.size === SLOT_COUNT;
}

function writeDefaultLineup(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...DEFAULT_LINEUP_HERO_IDS]));
}
