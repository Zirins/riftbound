// src/data/npcNames.ts
// World Feed NPC name pool — Riftbound-original names matching friend/covenant pools.

/** Wuxia-style cultivator names (see npcFriends.ts). */
export const NPC_FEED_CULTIVATOR_NAMES: readonly string[] = [
  'Yun Xi',
  'Lian Mei',
  'Zhao Feng',
  'Su Qing',
  'Han Rui',
  'Ning Shu',
  'Chen Wei',
  'Xia Lan',
  'Mu Dan',
  'Gu Heng',
  'Pei Ran',
  'Tao Lin',
  'Fei Yan',
  'Lu Ming',
  'Qin Yue',
  'Bai Zhou',
  'Rong Hui',
  'Shen An',
  'Jia Ling',
  'Dong Ze',
  'Wei An',
  'Lin Mo',
  'Fen Rou',
  'He Yan',
  'Xu Rui',
  'Mei Ling',
  'Zhou Kai',
  'Yao Chen',
];

/** Western-fantasy commander names (see npcCovenantMembers.ts). */
export const NPC_FEED_COMMANDER_NAMES: readonly string[] = [
  'Lyra Moonwake',
  'Darian Holt',
  'Sera Vex',
  'Korin Ash',
  'Mira Sol',
  'Thane Rook',
  'Elin Voss',
  'Pax Orin',
  'Nyx Calder',
  'Riven Cole',
  'Joss Pike',
  'Uma Flint',
  'Cade Wren',
  'Iora Penn',
  'Ren Calder',
  'Sora Vale',
];

/** Simulated Sect names for covenant feed events. */
export const NPC_FEED_COVENANT_NAMES: readonly string[] = [
  'Moonwake Sect',
  'Iron Meridian Hall',
  'Void Script Society',
  'Ember Sect',
  'Frost Pavilion',
  'Jade Archive',
  'Starfall Observatory',
  'Argent Trial Order',
];

/** All personal names used in feed messages (cultivators + commanders). */
export const NPC_FEED_PLAYER_NAMES: readonly string[] = [
  ...NPC_FEED_CULTIVATOR_NAMES,
  ...NPC_FEED_COMMANDER_NAMES,
];
