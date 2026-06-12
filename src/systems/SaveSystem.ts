// src/systems/SaveSystem.ts
// V0.1: localStorage team lineup + settings.
// V1.1: SaveRoot schema via riftbound_save_root.

import { ENERGY, HEROES, STARTER } from '../constants/gameConfig';
import type {
  FormationGrid,
  HeroOwnershipState,
  MailMessage,
  RealmSaveData,
  SaveRoot,
} from '../types';

const STORAGE_KEY = 'riftbound_mvp_formation';
const SETTINGS_KEY = 'riftbound_settings';
const SAVE_ROOT_KEY = 'riftbound_save_root';
const SCHEMA_VERSION = 2;

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
    return parsed;
  } catch {
    return null;
  }
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
  const now = Date.now();
  const today = toDateString(now);
  const defaultFormation = buildDefaultFormationGrid();
  const ownedHeroes = DEFAULT_LINEUP_HERO_IDS.map((heroId) => buildStarterHero(heroId, now));

  const realm: RealmSaveData = {
    realmId,
    playerName,
    avatarColorIndex: 0,
    accountLevel: 1,
    accountXP: 0,
    resonanceTier: 1,
    inventory: {
      gold: STARTER.GOLD,
      riftCrystals: STARTER.RIFT_CRYSTALS,
      voidGems: 0,
      xpFragments: STARTER.XP_FRAGMENTS,
      energy: STARTER.ENERGY,
      maxEnergy: ENERGY.MAX,
      lastEnergyRegenAt: now,
      ownedSigilIds: [],
      heroShards: {},
    },
    ownedHeroes,
    currentFormation: defaultFormation,
    clearedStages: [],
    pityCounters: {},
    arenaState: {
      rankPoints: 0,
      rankTier: 'rift_initiate',
      attemptsUsedToday: 0,
      lastAttemptResetDate: today,
      lastRewardClaimDate: '',
      defenseFormation: defaultFormation,
    },
    riftChronicle: {
      currentStreak: 0,
      lastClaimDate: '',
      totalDaysClaimed: 0,
    },
    tasks: [],
    mail: [buildWelcomeMail(now)],
    dailyShopState: {
      date: today,
      purchasedItemIds: [],
    },
    settings: {
      musicVolume: 80,
      sfxVolume: 80,
      defaultAutoUltimate: false,
    },
    lastSaved: now,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    realms: { [realmId]: realm },
    selectedRealmId: realmId,
  };
}

function buildWelcomeMail(sentAt: number): MailMessage {
  return {
    id: 'welcome_mail',
    fromName: 'Argent Trial Order',
    subject: 'Welcome to Rift City, Relic Bearer',
    body: 'Your assignment begins. The Rift gates are active along the eastern border. Supplies enclosed — use them well.',
    attachments: [{ type: 'crystals', amount: 300 }],
    isRead: false,
    isClaimed: false,
    sentAt,
    expiresAt: null,
  };
}

function buildStarterHero(heroId: string, acquiredAt: number): HeroOwnershipState {
  return {
    heroId,
    isOwned: true,
    starRank: 1,
    level: 1,
    currentXP: 0,
    shardCount: 0,
    equippedSigilIds: [],
    acquiredAt,
  };
}

function buildDefaultFormationGrid(): FormationGrid {
  const rows = ['front', 'front', 'back', 'back'] as const;
  const cols = [0, 1, 0, 1];

  return {
    slots: DEFAULT_LINEUP_HERO_IDS.map((heroId, slotIndex) => ({
      slotIndex,
      row: rows[slotIndex],
      col: cols[slotIndex],
      assignedHeroId: heroId,
    })),
  };
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
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
