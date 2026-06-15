// src/systems/ArenaMatchSystem.ts
// Resonance Arena opponents, wave scaling, rank tracking, and daily rewards.

import { ARENA } from '../constants/gameConfig';
import { ARENA_OPPONENTS, type ArenaOpponent } from '../data/arenaOpponents';
import { HEROES_DATA } from '../data/heroes';
import type { ArenaMatchResult, RealmSaveDataV3, WaveConfig } from '../types';
import { getLocalDateKey } from '../save/utils/saveDateUtils';
import { buildLegacyCurrencyBundle } from './legacyRewardBundle';
import { RewardSystem } from './RewardSystem';
import { ArenaSeasonSystem } from './ArenaSeasonSystem';
import { GameEventBus } from './GameEventBus';
import { computeRP } from './HeroProgressionSystem';
import { getBattleLineupHeroIds, loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

const BASELINE_FORMATION_RP = 8_000;
const OPPONENT_RP_TOLERANCE = 0.3;

function todayString(): string {
  return getLocalDateKey();
}

function createSeededRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function resetDaily(save: RealmSaveDataV3, dateKey: string): void {
  if (save.arenaState.lastAttemptResetDate === dateKey) return;

  save.arenaState = {
    ...save.arenaState,
    attemptsUsedToday: 0,
    lastAttemptResetDate: dateKey,
  };
}

export function resetIfNewDay(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const dateKey = getLocalDateKey();
  if (save.arenaState.lastAttemptResetDate === dateKey) return;

  resetDaily(save, dateKey);
  saveCurrentRealm(save);
}

export function getPlayerFormationRP(): number {
  const realm = loadCurrentRealm();
  if (!realm) return BASELINE_FORMATION_RP;

  const heroIds = getBattleLineupHeroIds();
  return heroIds.reduce((total, heroId) => {
    const heroData = HEROES_DATA.find((hero) => hero.id === heroId);
    const ownership = realm.ownedHeroes.find(
      (hero) => hero.heroId === heroId && hero.isOwned,
    );
    if (!heroData || !ownership) return total;
    return total + computeRP(ownership, heroData);
  }, 0);
}

export function getTierFromPoints(rankPoints: number): (typeof ARENA.RANK_TIERS)[number] {
  let tier: (typeof ARENA.RANK_TIERS)[number] = ARENA.RANK_TIERS[0];
  for (const candidate of ARENA.RANK_TIERS) {
    if (rankPoints >= candidate.minPoints) {
      tier = candidate;
    }
  }
  return tier;
}

export function getTierName(tierId: string): string {
  return ARENA.RANK_TIERS.find((tier) => tier.id === tierId)?.name ?? 'Rift Initiate';
}

export function getOpponentById(opponentId: string): ArenaOpponent | undefined {
  return ARENA_OPPONENTS.find((opponent) => opponent.id === opponentId);
}

export function getOpponents(count: number): ArenaOpponent[] {
  resetIfNewDay();

  const playerRp = getPlayerFormationRP();
  const minRp = playerRp * (1 - OPPONENT_RP_TOLERANCE);
  const maxRp = playerRp * (1 + OPPONENT_RP_TOLERANCE);

  let pool = ARENA_OPPONENTS.filter((opponent) => opponent.rp >= minRp && opponent.rp <= maxRp);
  if (pool.length < count) {
    pool = [...ARENA_OPPONENTS].sort(
      (a, b) => Math.abs(a.rp - playerRp) - Math.abs(b.rp - playerRp),
    );
  }

  const today = todayString();
  const rng = createSeededRng(`arena-${today}-${playerRp}`);
  const indices = pool.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count).map((index) => pool[index]);
}

function scaledCount(base: number, scale: number): number {
  return Math.max(1, Math.round(base * scale));
}

export function buildArenaWaveConfig(opponentId: string): WaveConfig[] {
  const opponent = getOpponentById(opponentId);
  const rp = opponent?.rp ?? BASELINE_FORMATION_RP;
  const scale = Math.max(0.75, Math.min(2.5, rp / BASELINE_FORMATION_RP));
  const statScale = Math.max(0.8, Math.min(2.2, rp / BASELINE_FORMATION_RP));
  const waveCount = rp >= 20_000 ? 4 : 3;

  const waves: WaveConfig[] = [
    {
      waveIndex: 0,
      enemies: [
        { enemyId: 'rift_grunt', count: scaledCount(3, scale) },
        { enemyId: 'rift_specter', count: scaledCount(2, scale) },
      ],
      isBossWave: false,
      statScale,
    },
    {
      waveIndex: 1,
      enemies: [
        { enemyId: 'rift_ironclad', count: scaledCount(2, scale) },
        { enemyId: 'rift_grunt', count: scaledCount(2, scale) },
        { enemyId: 'rift_invoker', count: scaledCount(1, scale) },
      ],
      isBossWave: false,
      statScale,
    },
    {
      waveIndex: 2,
      enemies: [
        { enemyId: 'rift_specter', count: scaledCount(2, scale) },
        { enemyId: 'rift_ironclad', count: scaledCount(2, scale) },
        { enemyId: 'rift_invoker', count: scaledCount(2, scale) },
      ],
      isBossWave: false,
      statScale,
    },
  ];

  if (waveCount >= 4) {
    waves.push({
      waveIndex: 3,
      enemies: [
        { enemyId: 'rift_warden', count: 1 },
        { enemyId: 'rift_ironclad', count: scaledCount(1, scale) },
        { enemyId: 'rift_invoker', count: scaledCount(1, scale) },
      ],
      isBossWave: true,
      statScale,
    });
  } else {
    waves[2] = {
      waveIndex: 2,
      enemies: [
        { enemyId: 'rift_warden', count: 1 },
        { enemyId: 'rift_grunt', count: scaledCount(2, scale) },
      ],
      isBossWave: true,
      statScale,
    };
  }

  return waves;
}

export function getAttemptsRemaining(): number {
  resetIfNewDay();
  const realm = loadCurrentRealm();
  const used = realm?.arenaState.attemptsUsedToday ?? 0;
  return Math.max(0, ARENA.DAILY_ATTEMPTS - used);
}

export function canChallenge(): boolean {
  return getAttemptsRemaining() > 0;
}

export function getDailyRewardPreview(): { gold: number; crystals: number } {
  const realm = loadCurrentRealm();
  const tier = getTierFromPoints(realm?.arenaState.rankPoints ?? 0);
  return { gold: tier.dailyGold, crystals: tier.dailyCrystals };
}

export function canClaimDailyReward(): boolean {
  resetIfNewDay();
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const today = todayString();
  return realm.arenaState.attemptsUsedToday >= 1
    && realm.arenaState.lastRewardClaimDate !== today;
}

export function claimDailyReward(): boolean {
  if (!canClaimDailyReward()) return false;

  const realm = loadCurrentRealm();
  if (!realm) return false;

  const save = realm as RealmSaveDataV3;
  const tier = getTierFromPoints(save.arenaState.rankPoints);
  RewardSystem.grantRewardBundle(save, buildLegacyCurrencyBundle('arena_season', [
    { type: 'gold', amount: tier.dailyGold },
    { type: 'crystals', amount: tier.dailyCrystals },
  ]));

  save.arenaState = {
    ...save.arenaState,
    lastRewardClaimDate: todayString(),
  };

  saveCurrentRealm(save);
  return true;
}

function getMatchRewards(win: boolean, rankPoints: number): { gold: number; crystals: number } {
  if (!win) return { gold: 0, crystals: 0 };

  const tier = getTierFromPoints(rankPoints);
  return {
    gold: Math.max(100, Math.floor(tier.dailyGold * 0.25)),
    crystals: Math.max(5, Math.floor(tier.dailyCrystals * 0.5)),
  };
}

export function resolveMatchResult(win: boolean, opponentId?: string): ArenaMatchResult {
  resetIfNewDay();

  const realm = loadCurrentRealm();
  if (!realm) {
    return {
      win,
      rankPointsDelta: 0,
      newRankPoints: 0,
      newTier: 'rift_initiate',
      rewardGold: 0,
      rewardCrystals: 0,
    };
  }

  const save = realm as RealmSaveDataV3;
  const delta = win ? ARENA.WIN_RANK_GAIN : -ARENA.LOSS_RANK_LOSS;
  const newRankPoints = Math.max(0, save.arenaState.rankPoints + delta);
  const newTier = getTierFromPoints(newRankPoints);
  const rewards = getMatchRewards(win, save.arenaState.rankPoints);

  if (rewards.gold > 0 || rewards.crystals > 0) {
    RewardSystem.grantRewardBundle(save, buildLegacyCurrencyBundle('arena_match', [
      { type: 'gold', amount: rewards.gold },
      { type: 'crystals', amount: rewards.crystals },
    ]));
  }

  save.arenaState = {
    ...save.arenaState,
    rankPoints: newRankPoints,
    rankTier: newTier.id,
    attemptsUsedToday: save.arenaState.attemptsUsedToday + 1,
  };

  ArenaSeasonSystem.recordMatchPlayed(save);

  if (win) {
    GameEventBus.emit(save, {
      type: 'arena_won',
      opponentId: opponentId ?? 'unknown_opponent',
    });
  }

  saveCurrentRealm(save);

  return {
    win,
    rankPointsDelta: delta,
    newRankPoints,
    newTier: newTier.name,
    rewardGold: rewards.gold,
    rewardCrystals: rewards.crystals,
  };
}

export function formatRp(rp: number): string {
  return rp.toLocaleString('en-US');
}
