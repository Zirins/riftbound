// src/systems/RiftChronicleSystem.ts
// 7-day login calendar rewards.

import { RIFT_CHRONICLE_REWARDS } from '../constants/gameConfig';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

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

  for (const reward of rewardEntry.rewards) {
    grantChronicleReward(reward);
  }

  const updatedRealm = loadCurrentRealm();
  if (!updatedRealm) return false;

  saveCurrentRealm({
    ...updatedRealm,
    riftChronicle: {
      currentStreak: updatedRealm.riftChronicle.currentStreak + 1,
      lastClaimDate: todayString(),
      totalDaysClaimed: updatedRealm.riftChronicle.totalDaysClaimed + 1,
    },
  });

  return true;
}

function grantChronicleReward(
  reward: (typeof RIFT_CHRONICLE_REWARDS)[number]['rewards'][number],
): void {
  switch (reward.type) {
    case 'gold':
      Economy.grant('gold', reward.amount);
      break;
    case 'crystals':
      Economy.grant('crystals', reward.amount);
      break;
    case 'xpFragments':
      Economy.grant('xpFragments', reward.amount);
      break;
    case 'shards_rare_random':
      grantRandomRareShards(reward.amount);
      break;
    case 'shards_hero':
      if ('heroId' in reward && typeof reward.heroId === 'string') {
        grantHeroShards(reward.heroId, reward.amount);
      }
      break;
    default:
      break;
  }
}

function grantRandomRareShards(amount: number): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const heroId = realm.ownedHeroes.find((h) => h.isOwned)?.heroId ?? 'kael';
  grantHeroShards(heroId, amount);
}

function grantHeroShards(heroId: string, amount: number): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const current = realm.inventory.heroShards[heroId] ?? 0;
  saveCurrentRealm({
    ...realm,
    inventory: {
      ...realm.inventory,
      heroShards: {
        ...realm.inventory.heroShards,
        [heroId]: current + amount,
      },
    },
  });
}
