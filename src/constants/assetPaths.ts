// src/constants/assetPaths.ts
// Single source of truth for optional art asset URLs (served from public/).
//
// Vite serves files in public/ at the site root, so Phaser loads e.g.
// `assets/heroes/kael_portrait.png` → public/assets/heroes/kael_portrait.png

/** Root URL prefix for all game art (no leading slash — Phaser loader convention). */
export const ASSET_ROOT = 'assets';

export const ASSET_PATHS = {
  backgrounds: {
    hub: `${ASSET_ROOT}/backgrounds/main_hub.png`,
    chapter2: `${ASSET_ROOT}/backgrounds/chapter_2_hollow_reaches.png`,
    chapter3: `${ASSET_ROOT}/backgrounds/chapter_3_ironreach_depths.png`,
  },
  heroes: {
    portrait: (heroId: string) => `${ASSET_ROOT}/heroes/${heroId}_portrait.png`,
  },
  enemies: {
    sprite: (enemyId: string) => `${ASSET_ROOT}/enemies/${enemyId}.png`,
  },
  currencies: {
    gold: `${ASSET_ROOT}/currencies/gold.png`,
    riftCrystal: `${ASSET_ROOT}/currencies/rift_crystal.png`,
    voidGem: `${ASSET_ROOT}/currencies/void_gem.png`,
    energy: `${ASSET_ROOT}/currencies/energy.png`,
    arenaCoin: `${ASSET_ROOT}/currencies/arena_coin.png`,
    covenantCoin: `${ASSET_ROOT}/currencies/covenant_coin.png`,
    friendshipPoint: `${ASSET_ROOT}/currencies/friendship_point.png`,
  },
  items: {
    xpFragment: `${ASSET_ROOT}/items/xp_fragment.png`,
    sigilDust: `${ASSET_ROOT}/items/sigil_dust.png`,
    awakeningCrystal: `${ASSET_ROOT}/items/awakening_crystal.png`,
    heroShardVoucher: `${ASSET_ROOT}/items/hero_shard_voucher.png`,
    sigilBoxCommon: `${ASSET_ROOT}/items/sigil_box_common.png`,
    sigilBoxRare: `${ASSET_ROOT}/items/sigil_box_rare.png`,
    sigilBoxEpic: `${ASSET_ROOT}/items/sigil_box_epic.png`,
    rewardBoxDaily: `${ASSET_ROOT}/items/reward_box_daily.png`,
    rewardBoxWeekly: `${ASSET_ROOT}/items/reward_box_weekly.png`,
    covenantBadge: `${ASSET_ROOT}/items/covenant_badge.png`,
    riftSeasonEmblem: `${ASSET_ROOT}/items/rift_season_emblem.png`,
    voidTrialRelic: `${ASSET_ROOT}/items/void_trial_relic.png`,
  },
  sigils: {
    icon: (sigilDefinitionId: string) => `${ASSET_ROOT}/sigils/${sigilDefinitionId}.png`,
  },
  ui: {
    rarityCommon: `${ASSET_ROOT}/ui/rarity_common.png`,
    rarityUncommon: `${ASSET_ROOT}/ui/rarity_uncommon.png`,
    rarityRare: `${ASSET_ROOT}/ui/rarity_rare.png`,
    rarityEpic: `${ASSET_ROOT}/ui/rarity_epic.png`,
    rarityLegendary: `${ASSET_ROOT}/ui/rarity_legendary.png`,
  },
} as const;

/** Campaign battle background for a chapter, or null when no art is defined (Chapter 1). */
export function getBattleBackgroundPath(chapterId: string): string | null {
  switch (chapterId) {
    case 'chapter_2':
      return ASSET_PATHS.backgrounds.chapter2;
    case 'chapter_3':
      return ASSET_PATHS.backgrounds.chapter3;
    default:
      return null;
  }
}

/** Absolute filesystem path under public/ for dev harness existence checks. */
export function getPublicAssetFilesystemPath(assetPath: string, projectRoot = process.cwd()): string {
  const normalized = assetPath.replace(/^\//, '');
  return `${projectRoot}/public/${normalized}`.replace(/\\/g, '/');
}
