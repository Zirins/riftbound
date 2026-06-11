// src/systems/SaveSystem.ts
// V0.1: localStorage team lineup + settings.

import { HEROES } from '../constants/gameConfig';

const STORAGE_KEY = 'riftbound_mvp_formation';
const SETTINGS_KEY = 'riftbound_settings';

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
