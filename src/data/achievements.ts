// src/data/achievements.ts
// V2 achievement definitions — 50 milestones across 6 categories (Section 23).

import type { GameEvent, HeroRarity, RewardBundle, SigilRarity } from '../types';

export type AchievementCategory =
  | 'combat'
  | 'collection'
  | 'progression'
  | 'economy'
  | 'social'
  | 'hidden';

export type AchievementSnapshotMetric =
  | 'stages_cleared_unique'
  | 'three_star_stages'
  | 'heroes_owned'
  | 'account_level'
  | 'sigils_owned'
  | 'highest_void_floor';

export type AchievementEventType = GameEvent['type'];

export type AchievementTrigger =
  | { kind: 'event_count'; event: AchievementEventType; target: number }
  | { kind: 'event_stars'; event: 'stage_cleared'; minStars: number; target: number }
  | { kind: 'event_swept'; event: 'stage_cleared'; target: number }
  | { kind: 'event_rarity'; event: 'hero_summoned'; rarity: HeroRarity; target: number }
  | { kind: 'event_sigil_rarity'; event: 'sigil_dissolved'; rarity: SigilRarity; target: number }
  | { kind: 'event_void_floor'; event: 'void_trial_floor_cleared'; minFloor: number; target: number }
  | { kind: 'event_star_level'; event: 'hero_star_up'; minStar: number; target: number }
  | { kind: 'event_awakening_level'; event: 'hero_awakened'; minLevel: number; target: number }
  | { kind: 'snapshot'; metric: AchievementSnapshotMetric; target: number };

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  hiddenDescription: string;
  isHidden: boolean;
  trigger: AchievementTrigger;
  reward: RewardBundle;
}

function achievementReward(voidGems: number, extras?: Partial<RewardBundle>): RewardBundle {
  return {
    source: 'achievement',
    currencies: [
      { type: 'void_gem', amount: voidGems },
      ...(extras?.currencies ?? []),
    ],
    items: extras?.items,
    heroShards: extras?.heroShards,
    sigils: extras?.sigils,
  };
}

const ACHIEVEMENT_LIST: AchievementDefinition[] = [
  // ─── Combat (10) ───────────────────────────────────────────────────────────
  {
    id: 'ach_combat_first_victory',
    category: 'combat',
    name: 'First Rift Victory',
    description: 'Clear 1 campaign stage.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'stage_cleared', target: 1 },
    reward: achievementReward(5, { currencies: [{ type: 'gold', amount: 500 }] }),
  },
  {
    id: 'ach_combat_clear_5_stages',
    category: 'combat',
    name: 'Rift Scout',
    description: 'Clear 5 campaign stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'stage_cleared', target: 5 },
    reward: achievementReward(10, { currencies: [{ type: 'gold', amount: 1_000 }] }),
  },
  {
    id: 'ach_combat_clear_15_stages',
    category: 'combat',
    name: 'Outskirts Veteran',
    description: 'Clear 15 campaign stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'stage_cleared', target: 15 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_combat_three_star_5',
    category: 'combat',
    name: 'Flawless Formation',
    description: 'Earn 3 stars on 5 campaign stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_stars', event: 'stage_cleared', minStars: 3, target: 5 },
    reward: achievementReward(10, { currencies: [{ type: 'rift_crystal', amount: 30 }] }),
  },
  {
    id: 'ach_combat_arena_win_1',
    category: 'combat',
    name: 'Arena Debut',
    description: 'Win 1 Resonance Arena match.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'arena_won', target: 1 },
    reward: achievementReward(5),
  },
  {
    id: 'ach_combat_arena_win_15',
    category: 'combat',
    name: 'Arena Regular',
    description: 'Win 15 Resonance Arena matches.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'arena_won', target: 15 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_combat_void_floor_5',
    category: 'combat',
    name: 'Void Walker',
    description: 'Clear 5 Void Trial floors.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'void_trial_floor_cleared', target: 5 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_combat_void_floor_15',
    category: 'combat',
    name: 'Void Ascendant',
    description: 'Clear 15 Void Trial floors.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'void_trial_floor_cleared', target: 15 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_combat_sweep_20',
    category: 'combat',
    name: 'Efficient Raider',
    description: 'Sweep campaign stages 20 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_swept', event: 'stage_cleared', target: 20 },
    reward: achievementReward(10, { currencies: [{ type: 'gold', amount: 2_000 }] }),
  },

  // ─── Collection (10) ───────────────────────────────────────────────────────
  {
    id: 'ach_collect_6_heroes',
    category: 'collection',
    name: 'Growing Roster',
    description: 'Own 6 heroes.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'heroes_owned', target: 6 },
    reward: achievementReward(5),
  },
  {
    id: 'ach_collect_12_heroes',
    category: 'collection',
    name: 'Full Bench',
    description: 'Own 12 heroes.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'heroes_owned', target: 12 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_collect_summon_10',
    category: 'collection',
    name: 'Temple Visitor',
    description: 'Summon heroes 10 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'hero_summoned', target: 10 },
    reward: achievementReward(8),
  },
  {
    id: 'ach_collect_summon_50',
    category: 'collection',
    name: 'Eternal Patron',
    description: 'Summon heroes 50 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'hero_summoned', target: 50 },
    reward: achievementReward(20),
  },
  {
    id: 'ach_collect_sigil_5',
    category: 'collection',
    name: 'Sigil Collector',
    description: 'Own 5 equipment Sigils.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'sigils_owned', target: 5 },
    reward: achievementReward(8),
  },
  {
    id: 'ach_collect_sigil_upgrade_10',
    category: 'collection',
    name: 'Sigil Smith',
    description: 'Upgrade Sigils 10 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'sigil_upgraded', target: 10 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_collect_dissolve_10',
    category: 'collection',
    name: 'Dust to Dust',
    description: 'Dissolve 10 Sigils.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'sigil_dissolved', target: 10 },
    reward: achievementReward(8, { items: [{ itemId: 'sigil_dust', quantity: 50 }] }),
  },
  {
    id: 'ach_collect_star_up_10',
    category: 'collection',
    name: 'Star Forger',
    description: 'Raise hero stars 10 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'hero_star_up', target: 10 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_collect_legendary_summon',
    category: 'collection',
    name: 'Legendary Echo',
    description: 'Summon a Legendary hero.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_rarity', event: 'hero_summoned', rarity: 'legendary', target: 1 },
    reward: achievementReward(20),
  },

  // ─── Progression (10) ──────────────────────────────────────────────────────
  {
    id: 'ach_prog_account_5',
    category: 'progression',
    name: 'Account Level 5',
    description: 'Reach Account Level 5.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'account_level', target: 5 },
    reward: achievementReward(5),
  },
  {
    id: 'ach_prog_account_10',
    category: 'progression',
    name: 'Account Level 10',
    description: 'Reach Account Level 10.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'account_level', target: 10 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_prog_account_20',
    category: 'progression',
    name: 'Account Level 20',
    description: 'Reach Account Level 20.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'account_level', target: 20 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_prog_stages_10_unique',
    category: 'progression',
    name: 'Map Reader',
    description: 'Clear 10 unique campaign stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'stages_cleared_unique', target: 10 },
    reward: achievementReward(8),
  },
  {
    id: 'ach_prog_stages_25_unique',
    category: 'progression',
    name: 'Pathfinder',
    description: 'Clear 25 unique campaign stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'stages_cleared_unique', target: 25 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_prog_three_star_15',
    category: 'progression',
    name: 'Perfectionist',
    description: 'Hold 3 stars on 15 unique stages.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'snapshot', metric: 'three_star_stages', target: 15 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_prog_star_6',
    category: 'progression',
    name: 'Six-Star Legend',
    description: 'Raise a hero to 6 stars.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_star_level', event: 'hero_star_up', minStar: 6, target: 1 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_prog_awaken_2',
    category: 'progression',
    name: 'Second Awakening',
    description: 'Reach Awakening Level 2 on a hero.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_awakening_level', event: 'hero_awakened', minLevel: 2, target: 1 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_prog_rift_tier_5',
    category: 'progression',
    name: 'Season Climber',
    description: 'Claim 5 Rift Season tiers.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'rift_season_tier_claimed', target: 5 },
    reward: achievementReward(10),
  },

  // ─── Economy (10) ──────────────────────────────────────────────────────────
  {
    id: 'ach_econ_contribute_5',
    category: 'economy',
    name: 'Sect Patron',
    description: 'Contribute to your Sect 5 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'covenant_contributed', target: 5 },
    reward: achievementReward(8, { currencies: [{ type: 'covenant_coin', amount: 20 }] }),
  },
  {
    id: 'ach_econ_contribute_25',
    category: 'economy',
    name: 'Steady Benefactor',
    description: 'Contribute to your Sect 25 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'covenant_contributed', target: 25 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_econ_rift_tier_10',
    category: 'economy',
    name: 'Season Investor',
    description: 'Claim 10 Rift Season tiers.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'rift_season_tier_claimed', target: 10 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_econ_summon_25',
    category: 'economy',
    name: 'Crystal Spender',
    description: 'Summon heroes 25 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'hero_summoned', target: 25 },
    reward: achievementReward(10, { currencies: [{ type: 'rift_crystal', amount: 50 }] }),
  },
  {
    id: 'ach_econ_sigil_upgrade_25',
    category: 'economy',
    name: 'Gold Sink',
    description: 'Upgrade Sigils 25 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'sigil_upgraded', target: 25 },
    reward: achievementReward(10, { currencies: [{ type: 'gold', amount: 3_000 }] }),
  },
  {
    id: 'ach_econ_dissolve_25',
    category: 'economy',
    name: 'Recycler',
    description: 'Dissolve 25 Sigils.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'sigil_dissolved', target: 25 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_econ_sweep_50',
    category: 'economy',
    name: 'Sweep Investor',
    description: 'Sweep campaign stages 50 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_swept', event: 'stage_cleared', target: 50 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_econ_arena_25',
    category: 'economy',
    name: 'Arena Spender',
    description: 'Win 25 Arena matches.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'arena_won', target: 25 },
    reward: achievementReward(12, { currencies: [{ type: 'arena_coin', amount: 100 }] }),
  },
  {
    id: 'ach_econ_awaken_5',
    category: 'economy',
    name: 'Crystal Awakener',
    description: 'Awaken heroes 5 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'hero_awakened', target: 5 },
    reward: achievementReward(15, { items: [{ itemId: 'awakening_crystal', quantity: 1 }] }),
  },

  // ─── Social (5) ────────────────────────────────────────────────────────────
  {
    id: 'ach_social_covenant_join',
    category: 'social',
    name: 'Bound by Sect',
    description: 'Join a Sect.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'covenant_joined', target: 1 },
    reward: achievementReward(10),
  },
  {
    id: 'ach_social_gift_5',
    category: 'social',
    name: 'Gift Bearer',
    description: 'Send 5 friend gifts.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'friend_gift_sent', target: 5 },
    reward: achievementReward(8),
  },
  {
    id: 'ach_social_gift_25',
    category: 'social',
    name: 'Generous Spirit',
    description: 'Send 25 friend gifts.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'friend_gift_sent', target: 25 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_social_contribute_50',
    category: 'social',
    name: 'Pillar of the Sect',
    description: 'Contribute to your Sect 50 times.',
    hiddenDescription: '???',
    isHidden: false,
    trigger: { kind: 'event_count', event: 'covenant_contributed', target: 50 },
    reward: achievementReward(15),
  },

  // ─── Hidden (10) ───────────────────────────────────────────────────────────
  {
    id: 'ach_hidden_perfect_first',
    category: 'hidden',
    name: 'Untouched Line',
    description: 'Earn 3 stars on a stage with a flawless clear.',
    hiddenDescription: 'Prove perfection in battle.',
    isHidden: true,
    trigger: { kind: 'event_stars', event: 'stage_cleared', minStars: 3, target: 1 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_hidden_arena_streak',
    category: 'hidden',
    name: 'Silent Dominance',
    description: 'Win 10 Arena matches.',
    hiddenDescription: 'Dominate the Resonance Arena.',
    isHidden: true,
    trigger: { kind: 'event_count', event: 'arena_won', target: 10 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_hidden_void_peak',
    category: 'hidden',
    name: 'Void Summit',
    description: 'Clear Void Trial Floor 20.',
    hiddenDescription: 'Reach the top of the Void Trial.',
    isHidden: true,
    trigger: { kind: 'event_void_floor', event: 'void_trial_floor_cleared', minFloor: 20, target: 1 },
    reward: achievementReward(25),
  },
  {
    id: 'ach_hidden_dissolve_epic',
    category: 'hidden',
    name: 'Epic Sacrifice',
    description: 'Dissolve an Epic Sigil.',
    hiddenDescription: 'Break an Epic Sigil for dust.',
    isHidden: true,
    trigger: { kind: 'event_sigil_rarity', event: 'sigil_dissolved', rarity: 'epic', target: 1 },
    reward: achievementReward(15, { items: [{ itemId: 'sigil_dust', quantity: 100 }] }),
  },
  {
    id: 'ach_hidden_legendary_pull',
    category: 'hidden',
    name: 'Fated Summon',
    description: 'Summon a Legendary hero.',
    hiddenDescription: 'Draw a Legendary from the temple.',
    isHidden: true,
    trigger: { kind: 'event_rarity', event: 'hero_summoned', rarity: 'legendary', target: 1 },
    reward: achievementReward(20),
  },
  {
    id: 'ach_hidden_sweep_master',
    category: 'hidden',
    name: 'Echo Farmer',
    description: 'Sweep campaign stages 100 times.',
    hiddenDescription: 'Master the sweep ritual.',
    isHidden: true,
    trigger: { kind: 'event_swept', event: 'stage_cleared', target: 100 },
    reward: achievementReward(20),
  },
  {
    id: 'ach_hidden_friend_50',
    category: 'hidden',
    name: 'Network of Bonds',
    description: 'Send 50 friend gifts.',
    hiddenDescription: 'Spread gifts across your circle.',
    isHidden: true,
    trigger: { kind: 'event_count', event: 'friend_gift_sent', target: 50 },
    reward: achievementReward(15),
  },
  {
    id: 'ach_hidden_covenant_founder',
    category: 'hidden',
    name: 'Sect Founder',
    description: 'Join a Sect.',
    hiddenDescription: 'Take your place in a Sect.',
    isHidden: true,
    trigger: { kind: 'event_count', event: 'covenant_joined', target: 1 },
    reward: achievementReward(12),
  },
  {
    id: 'ach_hidden_account_30',
    category: 'hidden',
    name: 'Veteran Bearer',
    description: 'Reach Account Level 30.',
    hiddenDescription: 'Grow your account to Level 30.',
    isHidden: true,
    trigger: { kind: 'snapshot', metric: 'account_level', target: 30 },
    reward: achievementReward(25),
  },
  {
    id: 'ach_hidden_awaken_3',
    category: 'hidden',
    name: 'Third Spark',
    description: 'Reach Awakening Level 3 on a hero.',
    hiddenDescription: 'Push a hero to Awakening III.',
    isHidden: true,
    trigger: { kind: 'event_awakening_level', event: 'hero_awakened', minLevel: 3, target: 1 },
    reward: achievementReward(20),
  },
];

export const ACHIEVEMENTS: AchievementDefinition[] = ACHIEVEMENT_LIST;

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((def) => [def.id, def]));

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS_BY_ID.get(id);
}

export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((def) => def.category === category);
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'combat',
  'collection',
  'progression',
  'economy',
  'social',
  'hidden',
];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  combat: 'Combat',
  collection: 'Collection',
  progression: 'Progression',
  economy: 'Economy',
  social: 'Social',
  hidden: 'Hidden',
};
