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
} as const;

// ─── Stages ───────────────────────────────────────────────────────────────────
export const STAGES = {
  STAGE_1: {
    ID: 'stage_1',
    DISPLAY_NAME: 'Stage 1 — Rift Outskirts',
  },
} as const;

// ─── Dev / verification (remove before release) ─────────────────────────────
export const DEV_MODE = {
  ENABLED: true,
  DEFEAT_SHORTCUT_KEY: 'D',
} as const;

// ─── App ──────────────────────────────────────────────────────────────────────
export const APP = {
  ID: 'com.riftboundsigils.game',
  NAME: 'Riftbound Sigils',
  VERSION: '0.1.0',
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
