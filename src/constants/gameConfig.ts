// src/constants/gameConfig.ts
// THE single source of truth for all numeric constants in Riftbound Sigils.
//
// Rule: If you are writing a raw number into game logic, stop.
// Name the constant here, then import it. No magic numbers anywhere else.

import type { WaveConfig } from '../types';

// ─── Canvas ───────────────────────────────────────────────────────────────────
// Landscape: 844 wide × 390 tall. Never swap these.
export const CANVAS = {
  WIDTH: 844,
  HEIGHT: 390,
  HUD_HEIGHT: 80,
  BATTLE_HEIGHT: 310,    // HEIGHT - HUD_HEIGHT
  HERO_ZONE_END: 422,    // x boundary — hero zone is x 0–422
  ENEMY_ZONE_START: 422, // x boundary — enemy zone is x 422–844
} as const;

// ─── Formation positions (landscape, y=0 at top) ─────────────────────────────
// Read these in FormationSystem.ts. Never hardcode position numbers elsewhere.
export const FORMATION = {
  HERO_POSITIONS: [
    { x: 280, y: 100 }, // Slot 0: Front-Left
    { x: 280, y: 210 }, // Slot 1: Front-Right
    { x: 110, y: 100 }, // Slot 2: Back-Left
    { x: 110, y: 210 }, // Slot 3: Back-Right
  ],
  ENEMY_POSITIONS: [
    { x: 564, y: 100 }, // Enemy Slot 0: Front-Left
    { x: 564, y: 210 }, // Enemy Slot 1: Front-Right
    { x: 734, y: 100 }, // Enemy Slot 2: Back-Left
    { x: 734, y: 210 }, // Enemy Slot 3: Back-Right
  ],
  WALK_IN_DURATION: 500,  // ms — hero/enemy walk-in animation
  HERO_WALK_IN_SPAWN_X: -50,       // px — heroes enter from off the left edge
  ENEMY_WALK_IN_SPAWN_OFFSET: 50,  // px — enemies enter from CANVAS.WIDTH + offset
  ARRIVAL_THRESHOLD: 2,            // px — all units within this distance = formation ready
  ENEMY_OVERFLOW_X_OFFSET: 50,     // px — extra x offset per enemy beyond slot 4
  ENEMY_SUMMON_SPREAD: 36,         // px — horizontal spread for Warden-summoned grunts
  LINEUP_SLOT_COUNT: 4,
  LINEUP_PLATFORM_WIDTH: 96,
  LINEUP_PLATFORM_HEIGHT: 14,
  LINEUP_SLOT_POSITIONS: [
    { x: 140, platformY: 200 },
    { x: 300, platformY: 200 },
    { x: 460, platformY: 200 },
    { x: 620, platformY: 200 },
  ],
  LINEUP_HERO_Y_OFFSET: -36,
  // Display slot order for lineup screen — tank first, then fighter, support, ranger.
  LINEUP_CLASS_SLOT_ORDER: ['tank', 'fighter', 'support', 'ranger'],
  COMBAT_FRONT_SLOT_INDICES: [0, 1],
  COMBAT_BACK_SLOT_INDICES: [2, 3],
  COMBAT_FRONTLINE_CLASSES: ['tank', 'fighter'],
  COMBAT_CLASS_ASSIGN_ORDER: ['tank', 'fighter', 'support', 'ranger', 'mage', 'assassin'],
} as const;

// ─── Combat ───────────────────────────────────────────────────────────────────
export const COMBAT = {
  MIN_DAMAGE: 1,
  ENERGY_MAX: 100,
  ENERGY_GAIN_ON_HIT: 10,
  ENERGY_GAIN_ON_TAKEN: 15,
  HEAL_ENERGY_GAIN: 12,
  MELEE_ATTACK_RANGE: 40,   // px — melee heroes and melee enemies
  PROJECTILE_SPEED: 450,    // px/s
  PROJECTILE_RADIUS: 6,     // px
  WAVE_PAUSE_DURATION: 1500,  // ms pause between waves
} as const;

// ─── Heroes ───────────────────────────────────────────────────────────────────
export const HEROES = {
  ENERGY_MAX: 100,
  PORTRAIT_BUTTON_RADIUS: 32,
  PORTRAIT_GLOW_COLOR: 0xffff00,
  PORTRAIT_GLOW_LINEWIDTH: 3,

  KAEL: {
    ID: 'kael',
    COLOR: 0x4488ff,
    RADIUS: 24,
    BASE_HP: 1800,
    HP_PER_LEVEL: 120,
    BASE_ATTACK: 80,
    ATTACK_PER_LEVEL: 6,
    BASE_DEFENSE: 60,
    DEFENSE_PER_LEVEL: 5,
    ATTACK_COOLDOWN: 1200,  // ms
    SPEED: 120,             // px/s
    ENERGY_GAIN_ON_HIT: 10,
    ENERGY_GAIN_ON_TAKEN: 15,
    TAUNT_HIT_COUNT: 5,
    TAUNT_DURATION: 2000,   // ms
    ULTIMATE_DAMAGE: 300,
    PULSE_RADIUS: 120,      // px — Iron Pulse AoE radius
    SHIELD_VALUE: 250,      // HP shield granted to all allies
    SHIELD_DURATION: 4000,  // ms
  },

  SURA: {
    ID: 'sura',
    COLOR: 0xff4422,
    RADIUS: 20,
    BASE_HP: 1100,
    HP_PER_LEVEL: 75,
    BASE_ATTACK: 145,
    ATTACK_PER_LEVEL: 12,
    BASE_DEFENSE: 25,
    DEFENSE_PER_LEVEL: 2,
    ATTACK_COOLDOWN: 800,   // ms
    SPEED: 150,             // px/s
    ENERGY_GAIN_ON_HIT: 14,
    ENERGY_GAIN_ON_TAKEN: 8,
    CLEAVE_HIT_COUNT: 5,
    CLEAVE_RADIUS: 120,     // px — Ember Cleave passive radius
    CLEAVE_ENERGY_MULT: 0.5,
    ULTIMATE_DAMAGE: 400,
    ULTIMATE_LINE_HALF_HEIGHT: 110, // px — Solar Rend y band; covers both enemy rows
    BURN_DPS: 80,           // damage per second from Solar Rend burn
    BURN_DURATION: 3000,    // ms
  },

  MIRA: {
    ID: 'mira',
    COLOR: 0x44cc66,
    RADIUS: 18,
    BASE_HP: 900,
    HP_PER_LEVEL: 60,
    BASE_ATTACK: 0,
    ATTACK_PER_LEVEL: 0,
    BASE_DEFENSE: 20,
    DEFENSE_PER_LEVEL: 2,
    HEAL_COOLDOWN: 2500,    // ms — Lantern Pulse passive interval
    SPEED: 130,             // px/s
    ENERGY_GAIN_ON_HEAL: 12,
    ENERGY_GAIN_ON_TAKEN: 10,
    PASSIVE_ENERGY_GAIN: 6, // energy per heal-cooldown tick when all allies are full HP
    PASSIVE_HEAL: 80,       // HP healed by Lantern Pulse
    ULTIMATE_HEAL: 300,     // HP healed to all allies by Rift Bloom
    RIFT_BLOOM_PULSE_SCALE: 4, // multiplier on ally radius for Rift Bloom VFX
  },

  NYRA: {
    ID: 'nyra',
    COLOR: 0xffcc22,
    RADIUS: 18,
    BASE_HP: 850,
    HP_PER_LEVEL: 55,
    BASE_ATTACK: 110,
    ATTACK_PER_LEVEL: 9,
    BASE_DEFENSE: 15,
    DEFENSE_PER_LEVEL: 1,
    ATTACK_COOLDOWN: 1000,  // ms
    SPEED: 140,             // px/s
    ENERGY_GAIN_ON_HIT: 12,
    ENERGY_GAIN_ON_TAKEN: 8,
    ECHO_CHANCE: 0.25,
    ECHO_DAMAGE_MULT: 0.5,
    STANDOFF_RANGE: 250,    // px — Nyra steps back if enemy closer than this
    ARROW_COUNT: 8,
    BARRAGE_DURATION: 1500, // ms — total duration of Void Barrage
    ARROW_DAMAGE: 120,
    ARMOR_PIERCE: 0.20,     // fraction of target defense ignored
  },
} as const;

// ─── Enemies ──────────────────────────────────────────────────────────────────
export const ENEMIES = {
  GRUNT: {
    ID: 'rift_grunt',
    COLOR: 0x887744,
    RADIUS: 16,
    HP: 400,
    ATTACK: 55,
    DEFENSE: 10,
    SPEED: 100,             // px/s
    ATTACK_COOLDOWN: 1200,  // ms
    ATTACK_RANGE: 40,       // px melee range
  },

  SPECTER: {
    ID: 'rift_specter',
    COLOR: 0x9944cc,
    RADIUS: 14,
    HP: 280,
    ATTACK: 75,
    DEFENSE: 5,
    SPEED: 70,              // px/s
    ATTACK_COOLDOWN: 2000,  // ms
    ATTACK_RANGE: 320,      // px ranged attack distance
    STANDOFF_RANGE: 280,    // px — stops advancing when closer than this
  },

  IRONCLAD: {
    ID: 'rift_ironclad',
    COLOR: 0x444455,
    RADIUS: 22,
    HP: 800,
    ATTACK: 40,
    DEFENSE: 30,
    SPEED: 60,              // px/s
    ATTACK_COOLDOWN: 1800,  // ms
    ATTACK_RANGE: 50,       // px
  },

  INVOKER: {
    ID: 'rift_invoker',
    COLOR: 0xcc4488,
    RADIUS: 14,
    HP: 200,
    ATTACK: 120,
    DEFENSE: 0,
    SPEED: 50,              // px/s
    ATTACK_COOLDOWN: 2500,  // ms
    ATTACK_RANGE: 380,      // px
    CLUSTER_RADIUS: 80,     // px — used for cluster-targeting check
  },
} as const;

// ─── Boss: Rift Warden ────────────────────────────────────────────────────────
export const WARDEN = {
  ID: 'rift_warden',
  COLOR: 0x882222,
  RADIUS: 40,
  HP: 2400,
  ATTACK: 80,
  DEFENSE: 15,
  SPEED: 40,              // px/s
  ATTACK_COOLDOWN: 4000,  // ms — standard melee swing
  SLAM_INTERVAL: 6000,    // ms — time between Rift Slam telegraphs
  SLAM_DELAY: 1500,       // ms — warning circle → damage resolution
  SLAM_RADIUS: 100,       // px — impact zone radius
  SLAM_DAMAGE: 200,
  WARN_ALPHA: 0.35,
  WARN_COLOR: 0xff2200,
  SUMMON_INTERVAL: 18000, // ms — time between Summon Adds activations
  SUMMON_COUNT: 2,        // Rift Grunts summoned per activation
} as const;

// ─── Waves (Stage 1) ──────────────────────────────────────────────────────────
// WaveSystem.ts reads this array. Never define wave data inside WaveSystem.
export const WAVES: WaveConfig[] = [
  {
    waveIndex: 0,
    enemies: [{ enemyId: 'rift_grunt', count: 4 }],
    isBossWave: false,
  },
  {
    waveIndex: 1,
    enemies: [
      { enemyId: 'rift_grunt', count: 3 },
      { enemyId: 'rift_specter', count: 2 },
    ],
    isBossWave: false,
  },
  {
    waveIndex: 2,
    enemies: [
      { enemyId: 'rift_ironclad', count: 2 },
      { enemyId: 'rift_invoker', count: 2 },
    ],
    isBossWave: false,
  },
  {
    waveIndex: 3,
    enemies: [
      { enemyId: 'rift_warden', count: 1 },
      { enemyId: 'rift_grunt', count: 2 },
    ],
    isBossWave: true,
  },
];

// ─── UI ───────────────────────────────────────────────────────────────────────
export const UI = {
  BACKGROUND_COLOR: 0x111122,
  HUD_BACKGROUND: 0x1a1a2e,
  HUD_ALPHA: 0.92,
  HP_BAR_WIDTH: 50,
  HP_BAR_HEIGHT: 5,
  HP_BAR_BG_COLOR: 0x333333,
  HP_BAR_Y_OFFSET: -30,        // px above entity center
  HP_COLOR_HIGH: 0x44ff44,
  HP_COLOR_LOW: 0xff4444,
  HP_COLOR_THRESHOLD: 0.3,     // fraction — below this shows red bar
  ENERGY_BAR_HEIGHT: 3,
  ENERGY_BAR_COLOR: 0x4488ff,
  ENERGY_BAR_Y_OFFSET: -22,    // px above entity center
  BOSS_BAR_Y: 12,              // px from top of canvas
  BOSS_BAR_WIDTH: 400,         // px — full width at boss max HP
  BOSS_BAR_HEIGHT: 10,
  BOSS_BAR_COLOR: 0xcc2222,
  WAVE_LABEL_X: 422,           // horizontal center of canvas
  WAVE_LABEL_Y: 14,
  HUD_PORTRAIT_RADIUS: 28,
  HUD_PORTRAIT_Y: 350,         // center Y of portrait buttons in HUD strip
  HUD_PORTRAIT_SPACING: 180,   // px between portrait button centers
  HUD_PORTRAIT_START_X: 120,   // x of first (leftmost) portrait button
  HUD_DEPTH: 1000,
  HUD_TAP_ZONE_HEIGHT: 74,
  ULTIMATE_VFX_DEPTH: 500,
  ULTIMATE_VFX_DURATION: 900,
  SOLAR_REND_LINE_ALPHA: 0.9,
  RIFT_BLOOM_PULSE_ALPHA: 0.85,
  FORMATION_LINEUP_STAGE_COLOR: 0x1a1a33,
  FORMATION_LINEUP_PLATFORM_COLOR: 0x3a3a55,
  FORMATION_LINEUP_TITLE_Y: 36,
  FORMATION_ROSTER_Y: 355,
  FORMATION_ROSTER_START_X: 140,
  FORMATION_ROSTER_SPACING: 140,
  FORMATION_BATTLE_BUTTON_X: 720,
  FORMATION_HERO_PREVIEW_RADIUS: 20,
  FORMATION_BUTTON_DISABLED_COLOR: '#666666',
  FORMATION_BUTTON_ENABLED_COLOR: '#44ccff',
  SCENE_NAV_BUTTON_WIDTH: 180,
  SCENE_NAV_BUTTON_HEIGHT: 44,
  SCENE_NAV_BUTTON_DEPTH: 1100,
  DEFEAT_BUTTON_Y: 255,
  DEFEAT_RETRY_X: 332,
  DEFEAT_CHANGE_TEAM_X: 512,
  DEFEAT_RETRY_BUTTON_WIDTH: 160,
  DEFEAT_CHANGE_TEAM_BUTTON_WIDTH: 220,
  DEFEAT_BUTTON_FILL_COLOR: 0x2a2a44,
  DEFEAT_BUTTON_BORDER_COLOR: 0x44ccff,
  SOUND_TOGGLE_ZONE_WIDTH: 120,
  SOUND_TOGGLE_ZONE_OFFSET_X: 50,
  SOUND_TOGGLE_ZONE_OFFSET_Y: 10,
  TOAST_DURATION_MS: 2500,
  SHORT_TOAST_DURATION_MS: 2200,
  SCENE_RESTART_DELAY_MS: 400,
} as const;

// ─── Stages ───────────────────────────────────────────────────────────────────
export const STAGES = {
  STAGE_1: {
    ID: 'stage_1',
    DISPLAY_NAME: 'Stage 1 — Rift Outskirts',
  },
} as const;

// ─── App ──────────────────────────────────────────────────────────────────────
export const APP = {
  ID: 'com.riftboundsigils.game',
  NAME: 'Riftbound Sigils',
  VERSION: '2.0.0',
  WEB_DIR: 'dist',
} as const;

// ─── AI targeting ─────────────────────────────────────────────────────────────
export const SUPPORT = {
  HEAL_TARGET_HP_THRESHOLD: 0.9, // allies above this HP ratio are not heal-targeted
} as const;

export const MAGE = {
  CLUSTER_RADIUS: 80, // px — mage targets the densest cluster of enemies within this radius
} as const;

export const RANGER = {
  STANDOFF_RANGE: 250, // px — ranger steps backward if nearest enemy is closer than this
} as const;

// ─── Star Rank Multipliers (V1.1) ─────────────────────────────────────────────
export const STAR_MULTIPLIERS: Record<number, number> = {
  1: 1.00,
  2: 1.15,
  3: 1.35,
  4: 1.60,
  5: 2.00,
} as const;

// ─── Level Cap by Star Rank (V1.1) ──────────────────────────────────────────────
export const LEVEL_CAP: Record<number, number> = {
  1: 20,
  2: 30,
  3: 40,
  4: 50,
  5: 60,
} as const;

// ─── Level Up Costs (tiered, V1.1) ──────────────────────────────────────────────
export const LEVEL_UP_COSTS = [
  { minLevel: 1,  maxLevel: 20, goldPerLevel: 500,    xpFragPerLevel: 10  },
  { minLevel: 21, maxLevel: 30, goldPerLevel: 1_200,  xpFragPerLevel: 25  },
  { minLevel: 31, maxLevel: 40, goldPerLevel: 3_000,  xpFragPerLevel: 60  },
  { minLevel: 41, maxLevel: 50, goldPerLevel: 7_500,  xpFragPerLevel: 150 },
  { minLevel: 51, maxLevel: 60, goldPerLevel: 18_000, xpFragPerLevel: 400 },
] as const;

// ─── Star Upgrade Costs (V1.1) ────────────────────────────────────────────────
export const STAR_UPGRADE_COSTS = [
  { from: 1, to: 2, shards: 10,  gold: 5_000 },
  { from: 2, to: 3, shards: 25,  gold: 15_000 },
  { from: 3, to: 4, shards: 50,  gold: 40_000 },
  { from: 4, to: 5, shards: 100, gold: 100_000 },
] as const;

// ─── Dissolve Shard Yields (V1.1) ─────────────────────────────────────────────
export const DISSOLVE_SHARDS = {
  uncommon:  5,
  rare:      10,
  epic:      25,
  legendary: 50,
} as const;

// ─── Gacha (V1.1) ─────────────────────────────────────────────────────────────
export const GACHA = {
  UNCOMMON_RATE:         0.60,
  RARE_RATE:             0.35,
  EPIC_RATE:             0.045,
  LEGENDARY_RATE:        0.005,
  SOFT_PITY_START:       75,
  SOFT_PITY_EPIC_BOOST:  0.05,    // +5% Epic rate per pull after soft pity
  HARD_PITY:             90,      // guaranteed Epic or higher
  LEGENDARY_PITY:        180,     // guaranteed Legendary (resets counter)
  TEN_PULL_GUARANTEE:    true,    // at least 1 Rare in every 10-pull
  SINGLE_PULL_COST:      100,     // Rift Crystals
  TEN_PULL_COST:         900,     // 10% discount vs 10×100
} as const;

// ─── Energy (V1.1) ────────────────────────────────────────────────────────────
export const ENERGY = {
  MAX:                150,
  STARTING:           60,
  REGEN_PER_MINUTE:   1,          // full refill from 0 in 2.5 hours
  CHRONICLE_GRANT:    60,
  DEFEAT_REFUND_PCT:  0.5,        // 50% refund if ≥2 waves cleared
} as const;

// ─── New Player Starter Resources (V1.1) ────────────────────────────────────────
export const STARTER = {
  GOLD:           5_000,
  RIFT_CRYSTALS:  300,
  XP_FRAGMENTS:   50,
  ENERGY:         60,
} as const;

// ─── RP Formula Weights (V1.1) ────────────────────────────────────────────────
export const RP_FORMULA_WEIGHTS = {
  HP_WEIGHT:      0.5,
  ATTACK_WEIGHT:  10,
  DEFENSE_WEIGHT: 5,
  STARS_WEIGHT:   150,
  LEVEL_WEIGHT:   30,
} as const;

// ─── Account Level & Resonance Tier (V1.1 approximation) ─────────────────────
export const ACCOUNT_PROGRESSION = {
  STAGES_PER_LEVEL: 5,
  LEVELS_PER_TIER: 5,
} as const;

const ACCOUNT_TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

export function computeAccountLevel(clearedStageCount: number): number {
  return 1 + Math.floor(clearedStageCount / ACCOUNT_PROGRESSION.STAGES_PER_LEVEL);
}

export function getAccountTierLabel(accountLevel: number): string {
  const tierIndex = Math.min(
    ACCOUNT_TIER_ROMAN.length - 1,
    Math.floor((Math.max(1, accountLevel) - 1) / ACCOUNT_PROGRESSION.LEVELS_PER_TIER),
  );
  return `Tier ${ACCOUNT_TIER_ROMAN[tierIndex]}`;
}

// ─── Arena (V1.1) ─────────────────────────────────────────────────────────────
export const ARENA = {
  DAILY_ATTEMPTS:       5,
  WIN_RANK_GAIN:        15,
  LOSS_RANK_LOSS:       5,
  RANK_TIERS: [
    { id: 'rift_initiate',  name: 'Rift Initiate',  minPoints: 0,      dailyGold: 400,   dailyCrystals: 8  },
    { id: 'rift_adept',     name: 'Rift Adept',     minPoints: 1_000,  dailyGold: 800,   dailyCrystals: 15 },
    { id: 'rift_sentinel',  name: 'Rift Sentinel',  minPoints: 3_000,  dailyGold: 1_600, dailyCrystals: 30 },
    { id: 'rift_vanguard',  name: 'Rift Vanguard',  minPoints: 6_000,  dailyGold: 3_200, dailyCrystals: 60 },
    { id: 'rift_ascendant', name: 'Rift Ascendant', minPoints: 10_000, dailyGold: 6_400, dailyCrystals: 120 },
    { id: 'rift_paragon',   name: 'Rift Paragon',   minPoints: 15_000, dailyGold: 12_000, dailyCrystals: 200 },
  ],
} as const;

// ─── Rift Chronicle 7-Day Rewards (V1.1) ─────────────────────────────────────
export const RIFT_CHRONICLE_REWARDS = [
  { day: 1, rewards: [{ type: 'gold',      amount: 500  }] },
  { day: 2, rewards: [{ type: 'crystals',  amount: 50   }] },
  { day: 3, rewards: [{ type: 'xpFragments', amount: 30 }] },
  { day: 4, rewards: [{ type: 'gold',      amount: 1_000 }, { type: 'crystals', amount: 50 }] },
  { day: 5, rewards: [{ type: 'shards_rare_random', amount: 5 }] },
  { day: 6, rewards: [{ type: 'gold',      amount: 2_000 }, { type: 'xpFragments', amount: 60 }] },
  { day: 7, rewards: [{ type: 'crystals',  amount: 100 }, { type: 'shards_hero', heroId: 'kael', amount: 10 }] },
] as const;

// ─── Feature Unlock Gates (V1.1) ────────────────────────────────────────────────
export const FEATURE_UNLOCKS = {
  CAMPAIGN:           { type: 'always' },
  HEROES_ROSTER:      { type: 'always' },
  FORMATION:          { type: 'always' },
  SUMMON_TEMPLE:      { type: 'stage_clear', stageId: 'stage_1_2' },
  DAILY_TASKS:        { type: 'stage_clear', stageId: 'stage_1_2' },
  CELESTIAL_MARKET:   { type: 'stage_clear', stageId: 'stage_1_3' },
  INVENTORY:          { type: 'stage_clear', stageId: 'stage_1_3' },
  RESONANCE_ARENA:    { type: 'stage_clear', stageId: 'stage_1_5' },
  MAIL:               { type: 'always' },
  RIFT_CHRONICLE:     { type: 'always' },
  VOID_TRIAL:         { type: 'stage_clear', stageId: 'stage_2_4' },
  ACHIEVEMENTS:       { type: 'stage_clear', stageId: 'stage_1_3' },
  COVENANT:           { type: 'stage_clear', stageId: 'stage_1_8' },
  HERO_DETAIL_LEVEL:  { type: 'always' },
  HERO_DETAIL_STAR:   { type: 'always' },
} as const;

// ─── New Hero Constants (V1.1) ────────────────────────────────────────────────
export const HERO_NEW = {
  REN: {
    ID: 'ren_vale',
    COLOR: 0x3B1E5A, RADIUS: 18,
    BASE_HP: 920, HP_PER_LEVEL: 60, BASE_ATTACK: 155, ATTACK_PER_LEVEL: 13,
    BASE_DEFENSE: 18, DEFENSE_PER_LEVEL: 1, ATTACK_COOLDOWN: 900, SPEED: 165,
    ENERGY_GAIN_ON_HIT: 15, ENERGY_GAIN_ON_TAKEN: 8,
    MARK_HIT_COUNT: 4, MARK_DAMAGE_BONUS: 0.20, MARK_DURATION: 3000,
    ULTIMATE_DAMAGE: 450, ARMOR_PIERCE: 0.30,
  },
  SOLENNE: {
    ID: 'solenne_arclight',
    COLOR: 0x2F6FFF, RADIUS: 18,
    BASE_HP: 880, HP_PER_LEVEL: 58, BASE_ATTACK: 140, ATTACK_PER_LEVEL: 12,
    BASE_DEFENSE: 14, DEFENSE_PER_LEVEL: 1, ATTACK_COOLDOWN: 1800, SPEED: 115,
    ENERGY_GAIN_ON_HIT: 12, ENERGY_GAIN_ON_TAKEN: 10,
    SPLASH_RADIUS: 90, SPLASH_DAMAGE_MULT: 0.30,
    ULTIMATE_DAMAGE: 380, SLOW_AMOUNT: 0.40, SLOW_DURATION: 1500,
  },
  VEYRA: {
    ID: 'veyra_hollowglass',
    COLOR: 0x6A1B3F, RADIUS: 19,
    BASE_HP: 1050, HP_PER_LEVEL: 70, BASE_ATTACK: 95, ATTACK_PER_LEVEL: 8,
    BASE_DEFENSE: 28, DEFENSE_PER_LEVEL: 2, HEAL_COOLDOWN: 2200, SPEED: 125,
    ENERGY_GAIN_ON_ABILITY: 14, ENERGY_GAIN_ON_TAKEN: 12,
    GLARE_INTERVAL: 3000, ATTACK_REDUCE_PCT: 0.15,
    ULTIMATE_DAMAGE: 200, HEX_DAMAGE_REDUCTION: 0.25, HEX_DURATION: 4000,
  },
  THANE: {
    ID: 'thane_ironroot',
    COLOR: 0x6B6F3A, RADIUS: 26,
    BASE_HP: 2200, HP_PER_LEVEL: 145, BASE_ATTACK: 75, ATTACK_PER_LEVEL: 5,
    BASE_DEFENSE: 80, DEFENSE_PER_LEVEL: 7, ATTACK_COOLDOWN: 1400, SPEED: 100,
    ENERGY_GAIN_ON_HIT: 8, ENERGY_GAIN_ON_TAKEN: 20,
    ROOTGUARD_STACK: 8, ROOTGUARD_MAX_STACKS: 10, ROOTGUARD_DECAY_RATE: 1,
    SHIELD_VALUE: 600, TAUNT_DURATION: 4000,
  },
  CAIRA: {
    ID: 'caira_dawnveil',
    COLOR: 0xF4E6A1, RADIUS: 20,
    BASE_HP: 1200, HP_PER_LEVEL: 80, BASE_ATTACK: 0, ATTACK_PER_LEVEL: 0,
    BASE_DEFENSE: 35, DEFENSE_PER_LEVEL: 3, HEAL_COOLDOWN: 2000, SPEED: 135,
    ENERGY_GAIN_ON_HEAL: 16, ENERGY_GAIN_ON_TAKEN: 12,
    PASSIVE_HEAL: 90, LOW_HP_THRESHOLD: 0.30, LOW_HP_HEAL_MULT: 2.0,
    ULTIMATE_HEAL: 350, SHIELD_VALUE: 200,
  },
  MAREK: {
    ID: 'marek_stormreign',
    COLOR: 0x0F5C78, RADIUS: 22,
    BASE_HP: 1500, HP_PER_LEVEL: 100, BASE_ATTACK: 170, ATTACK_PER_LEVEL: 14,
    BASE_DEFENSE: 40, DEFENSE_PER_LEVEL: 3, ATTACK_COOLDOWN: 750, SPEED: 155,
    ENERGY_GAIN_ON_HIT: 16, ENERGY_GAIN_ON_TAKEN: 10,
    SQUALL_STACK: 12, SQUALL_MAX_STACKS: 8, SQUALL_RESET_TIME: 2000,
    ULTIMATE_DAMAGE: 520, CLEAVE_Y_RANGE: 60, STAGGER_DURATION: 2000, STAGGER_SPEED_REDUCE: 0.30,
  },
} as const;

// ─── V2 Save Schema ───────────────────────────────────────────────────────────
export const SAVE_SCHEMA = {
  V1_1: 2,
  V2: 3,
} as const;

// ─── V2 Sigil Equipment ───────────────────────────────────────────────────────
export const SIGIL = {
  MAX_LEVEL: 10,
  SLOTS_PER_HERO_V2: 2,
  BREAKTHROUGH_LEVELS: [4, 7, 10],
  DISSOLVE_DUST: { common: 2, uncommon: 5, rare: 10, epic: 20, legendary: 50 },
  LEVEL_COST_GOLD: [500, 1000, 2000, 3500, 5000, 8000, 12000, 18000, 25000, 35000],
  BREAKTHROUGH_DUST: [0, 0, 0, 20, 0, 0, 40, 0, 0, 80],
} as const;

// ─── V2 Awakening ─────────────────────────────────────────────────────────────
export const AWAKENING = {
  REQUIRED_STAR_RANK: 5,
  MAX_LEVEL: 3,
  CRYSTAL_COSTS: [10, 25, 50],
  GOLD_COSTS: [50_000, 150_000, 400_000],
} as const;

// ─── V2 Resonance Bonds ───────────────────────────────────────────────────────
export const BONDS = {
  FACTION_THRESHOLDS: [2, 4, 6, 8, 10],
  FACTION_BONUSES: { atkPercent: [0.02, 0.04, 0.06, 0.09, 0.12] },
  CLASS_THRESHOLDS: [2, 4],
  COLLECTION_THRESHOLDS: [5, 8, 10],
  COLLECTION_BONUSES: { hpPercent: [0.03, 0.06, 0.10] },
} as const;

// ─── V2 Formation Presets ─────────────────────────────────────────────────────
export const FORMATION_PRESETS = {
  MAX_PRESETS: 5,
} as const;

// ─── V2 Battle Stat Caps ──────────────────────────────────────────────────────
export const BATTLE_STAT_CAPS = {
  CRIT_CHANCE: 0.75,
  CRIT_DAMAGE: 2.50,
  DODGE_CHANCE: 0.50,
  DAMAGE_REDUCTION: 0.70,
  ATTACK_SPEED_BONUS: 1.00,
  ENERGY_GAIN_BONUS: 1.00,
  HEALING_REDUCTION: 0.80,
} as const;

// ─── V2 Void Trial ────────────────────────────────────────────────────────────
export const VOID_TRIAL = {
  MAX_FLOOR: 20,
  DAILY_ATTEMPTS: 3,
} as const;

// ─── V2 Rift Season (Battle Pass) ───────────────────────────────────────────
export const RIFT_SEASON = {
  TOTAL_TIERS: 30,
  XP_PER_TIER: 100,
  SEASON_DURATION_DAYS: 30,
  PREMIUM_TRACK_COST_VOID_GEMS: 800,
} as const;

// ─── V2 Featured Banner ───────────────────────────────────────────────────────
export const FEATURED_BANNER = {
  DURATION_DAYS: 14,
  SOFT_PITY_START: 60,
  HARD_PITY: 120,
} as const;

// ─── V2 Offline Rewards ───────────────────────────────────────────────────────
export const OFFLINE = {
  MIN_HOURS_TO_TRIGGER: 2,
  MAX_HOURS: 12,
  GOLD_PER_HOUR: 500,
  XP_PER_HOUR: 5,
  ENERGY_PER_HOUR: 3,
} as const;

// ─── V2 Monetization Flags ────────────────────────────────────────────────────
export const MONETIZATION_FLAGS = {
  ENABLE_STORE_UI: true,
  ENABLE_TEST_BILLING: true,
  ENABLE_PRODUCTION_BILLING: false,
  ENABLE_DEV_PURCHASES: true,
} as const;
