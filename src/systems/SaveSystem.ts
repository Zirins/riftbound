// src/systems/SaveSystem.ts
// V0.1: localStorage formation slot assignment + settings.

import { HEROES } from '../constants/gameConfig';
const STORAGE_KEY = 'riftbound_mvp_formation';
const SETTINGS_KEY = 'riftbound_settings';

const DEFAULT_SLOT_HERO_IDS: readonly string[] = [
  HEROES.KAEL.ID,
  HEROES.SURA.ID,
  HEROES.MIRA.ID,
  HEROES.NYRA.ID,
];

const MVP_HERO_IDS = new Set(DEFAULT_SLOT_HERO_IDS);
const FRONT_SLOTS = new Set([0, 1]);

export interface GameSettings {
  soundMuted: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundMuted: false,
};

/** Returns heroId per slot 0–3 for battle spawn. Resets invalid saves to default. */
export function getBattleFormationSlots(): readonly string[] {
  const saved = readSavedSlots();
  if (saved && isValidMvpFormation(saved)) {
    return saved;
  }

  writeDefaultFormation();
  return DEFAULT_SLOT_HERO_IDS;
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

/** Removes saved formation so the player can assign a new team (Prompt 9 grid). */
export function clearFormation(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function readSavedSlots(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
      return null;
    }
    return parsed as string[];
  } catch {
    return null;
  }
}

function isValidMvpFormation(slots: string[]): boolean {
  if (slots.length !== 4) return false;

  const seen = new Set<string>();
  for (const heroId of slots) {
    if (!MVP_HERO_IDS.has(heroId) || seen.has(heroId)) return false;
    seen.add(heroId);
  }

  const kaelSlot = slots.indexOf(HEROES.KAEL.ID);
  return kaelSlot !== -1 && FRONT_SLOTS.has(kaelSlot);
}

function writeDefaultFormation(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...DEFAULT_SLOT_HERO_IDS]));
}
