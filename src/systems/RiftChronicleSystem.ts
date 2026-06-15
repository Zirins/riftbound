// src/systems/RiftChronicleSystem.ts
// 7-day login calendar rewards.

import { HEROES, RIFT_CHRONICLE_REWARDS } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import { buildLegacyCurrencyBundle } from './legacyRewardBundle';
import { RewardSystem } from './RewardSystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import type { RealmSaveDataV3, RewardBundle } from '../types';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isAvailableToday(): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;
  return realm.riftChronicle.lastClaimDate !== todayString();
}

export function checkAndUpdate(): void {
  // Availability is computed on read; no persistent mutation required on hub entry.
  isAvailableToday();
}

export function getTodayReward(): (typeof RIFT_CHRONICLE_REWARDS)[number] | null {
  const realm = loadCurrentRealm();
  if (!realm || !isAvailableToday()) return null;

  const dayIndex = realm.riftChronicle.currentStreak % RIFT_CHRONICLE_REWARDS.length;
  return RIFT_CHRONICLE_REWARDS[dayIndex] ?? null;
}

export function claimToday(): boolean {
  const realm = loadCurrentRealm();
  if (!realm || !isAvailableToday()) return false;

  const rewardEntry = getTodayReward();
  if (!rewardEntry) return false;

  const save = realm as RealmSaveDataV3;
  for (const reward of rewardEntry.rewards) {
    const bundle = buildChronicleRewardBundle(save, reward);
    if (bundle) {
      RewardSystem.grantRewardBundle(save, bundle);
    }
  }

  save.riftChronicle = {
    currentStreak: save.riftChronicle.currentStreak + 1,
    lastClaimDate: todayString(),
    totalDaysClaimed: save.riftChronicle.totalDaysClaimed + 1,
  };

  saveCurrentRealm(save);
  return true;
}

function buildChronicleRewardBundle(
  save: RealmSaveDataV3,
  reward: (typeof RIFT_CHRONICLE_REWARDS)[number]['rewards'][number],
): RewardBundle | null {
  switch (reward.type) {
    case 'gold':
      return buildLegacyCurrencyBundle('rift_chronicle', [{ type: 'gold', amount: reward.amount }]);
    case 'crystals':
      return buildLegacyCurrencyBundle('rift_chronicle', [{ type: 'crystals', amount: reward.amount }]);
    case 'xpFragments':
      return buildLegacyCurrencyBundle('rift_chronicle', [{ type: 'xpFragments', amount: reward.amount }]);
    case 'shards_rare_random': {
      const heroId = pickRandomRareShardHeroId(save);
      return {
        source: 'rift_chronicle',
        heroShards: [{ heroId, quantity: reward.amount }],
      };
    }
    case 'shards_hero':
      if ('heroId' in reward && typeof reward.heroId === 'string') {
        return {
          source: 'rift_chronicle',
          heroShards: [{ heroId: reward.heroId, quantity: reward.amount }],
        };
      }
      return null;
    default:
      return null;
  }
}

function pickRandomRareShardHeroId(save: RealmSaveDataV3): string {
  const rareOwnedIds = save.ownedHeroes
    .filter((hero) => hero.isOwned)
    .map((hero) => hero.heroId)
    .filter((heroId) => HEROES_DATA.find((data) => data.id === heroId)?.rarity === 'rare');

  const pool = rareOwnedIds.length > 0 ? rareOwnedIds : [HEROES.KAEL.ID];
  return pool[Math.floor(Math.random() * pool.length)] ?? HEROES.KAEL.ID;
}
