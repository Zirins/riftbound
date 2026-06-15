// src/systems/CovBossSystem.ts
// Weekly Sect boss — shared HP, attempts, NPC damage, kill cache mail (Section 26).

import { AWAKENING_CRYSTAL_ITEM_ID } from '../data/awakeningData';
import {
  getCovenantBoss,
  getCovenantBossWaves,
  pickBossIdForWeek,
} from '../data/covenantBosses';
import { getLocalWeekKey } from '../save/utils/saveDateUtils';
import type {
  CovenantBossState,
  CovenantNpcDamageEntry,
  RealmSaveDataV3,
  RewardBundle,
} from '../types';
import { CovSystem } from './CovSystem';
import { createRewardMail } from './MailSystem';
import { ResetService } from './ResetService';
import { RewardSystem } from './RewardSystem';

const WEEKLY_ATTEMPTS = 3;

const ATTEMPT_GOLD = 2_500;
const ATTEMPT_COINS = 20;
const ATTEMPT_SIGIL_DUST_CHANCE = 0.15;
const ATTEMPT_SIGIL_DUST_QTY = 5;

const KILL_CACHE_COINS = 100;
const KILL_CACHE_SIGIL_DUST = 40;
const KILL_CACHE_CRYSTAL_CHANCE = 0.25;

/**
 * Deterministic RNG for NPC boss damage.
 * Seed formula: `${dateKey}|${covId}|${memberId}` — changes once per local day per member.
 */
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

function computeNpcDailyDamage(
  dateKey: string,
  covId: string,
  memberId: string,
  resonancePower: number,
): number {
  const seed = `${dateKey}|${covId}|${memberId}`;
  const rng = createSeededRng(seed);
  const variance = 0.85 + rng() * 0.3;
  return Math.floor(resonancePower * variance);
}

function ensureBossStateFields(bossState: CovenantBossState): void {
  if (bossState.playerDamageThisWeek === undefined) bossState.playerDamageThisWeek = 0;
  if (bossState.lastNpcDamageDate === undefined) bossState.lastNpcDamageDate = '';
  if (bossState.npcDamageToday === undefined) bossState.npcDamageToday = [];
  if (bossState.killRewardMailSent === undefined) bossState.killRewardMailSent = false;
}

/** Remap Phase 20 placeholder boss ids (e.g. void_colossus) to the real weekly pool. */
function normalizeStaleBossId(bossState: CovenantBossState): void {
  if (getCovenantBoss(bossState.bossId)) return;

  const bossId = pickBossIdForWeek(bossState.lastWeeklyResetWeekKey);
  const boss = getCovenantBoss(bossId);
  if (!boss) return;

  if (import.meta.env.DEV) {
    console.info('[CovBossSystem] remapped stale bossId', {
      from: bossState.bossId,
      to: bossId,
    });
  }

  bossState.bossId = bossId;
  bossState.maxHp = boss.maxHp;
  bossState.currentHp = Math.min(bossState.currentHp, boss.maxHp);
}

function buildFreshBossState(weekKey: string): CovenantBossState {
  const bossId = pickBossIdForWeek(weekKey);
  const boss = getCovenantBoss(bossId);
  const maxHp = boss?.maxHp ?? 1_000_000;

  return {
    bossId,
    currentHp: maxHp,
    maxHp,
    attemptsUsedThisWeek: 0,
    lastWeeklyResetWeekKey: weekKey,
    defeatedThisWeek: false,
    playerDamageThisWeek: 0,
    lastNpcDamageDate: '',
    npcDamageToday: [],
    killRewardMailSent: false,
  };
}

function rollAttemptReward(save: RealmSaveDataV3): RewardBundle {
  const bundle: RewardBundle = {
    source: 'covenant_boss',
    currencies: [
      { type: 'gold', amount: ATTEMPT_GOLD },
      { type: 'covenant_coin', amount: ATTEMPT_COINS },
    ],
  };

  if (Math.random() < ATTEMPT_SIGIL_DUST_CHANCE) {
    bundle.items = [{ itemId: 'sigil_dust', quantity: ATTEMPT_SIGIL_DUST_QTY }];
  }

  if (import.meta.env.DEV) {
    console.info('[CovBossSystem] attempt reward', bundle);
  }

  void save;
  return bundle;
}

function buildKillCacheBundle(save: RealmSaveDataV3): RewardBundle {
  const bundle: RewardBundle = {
    source: 'covenant_boss',
    currencies: [{ type: 'covenant_coin', amount: KILL_CACHE_COINS }],
    items: [{ itemId: 'sigil_dust', quantity: KILL_CACHE_SIGIL_DUST }],
  };

  const covLevel = save.covenantState?.covLevel ?? 1;
  if (covLevel >= 5 && Math.random() < KILL_CACHE_CRYSTAL_CHANCE) {
    bundle.items = [
      ...(bundle.items ?? []),
      { itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 },
    ];
  }

  return bundle;
}

export interface CovBossBattleResult {
  damageDealt: number;
  rewardBundle: RewardBundle;
  bossDefeated: boolean;
}

export interface CovBossAttemptResult {
  success: boolean;
  reason?: string;
}

export class CovBossSystem {
  static ensureBossState(save: RealmSaveDataV3): void {
    if (!save.covenantState) return;
    ensureBossStateFields(save.covenantState.bossState);
    normalizeStaleBossId(save.covenantState.bossState);
  }

  static ensureCurrentWeek(save: RealmSaveDataV3, now = new Date()): void {
    if (!CovSystem.isInCovenant(save)) return;

    const weekKey = getLocalWeekKey(now);
    CovBossSystem.ensureBossState(save);
    if (save.covenantState.bossState.lastWeeklyResetWeekKey !== weekKey) {
      CovBossSystem.resetWeekly(save, weekKey);
    }
  }

  /** Unconditional weekly reset — always applies fresh boss state (Phase 22 pattern). */
  static resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
    if (!save.covenantState) return;

    const previous = { ...save.covenantState.bossState };
    save.covenantState.bossState = buildFreshBossState(weekKey);

    if (import.meta.env.DEV) {
      console.info('[CovBossSystem] resetWeekly', {
        previousWeekKey: previous.lastWeeklyResetWeekKey,
        weekKey,
        previousBossId: previous.bossId,
        newBossId: save.covenantState.bossState.bossId,
        previousHp: previous.currentHp,
        newHp: save.covenantState.bossState.currentHp,
      });
    }
  }

  static syncNpcDamage(save: RealmSaveDataV3, now = new Date()): CovenantNpcDamageEntry[] {
    if (!CovSystem.isInCovenant(save)) return [];

    CovBossSystem.ensureCurrentWeek(save, now);
    const bossState = save.covenantState.bossState;
    if (bossState.defeatedThisWeek || bossState.currentHp <= 0) return [];

    const dateKey = ResetService.getLocalDateKey(now);
    if (bossState.lastNpcDamageDate === dateKey) {
      return bossState.npcDamageToday;
    }

    const covId = save.covenantState.covId ?? 'unknown_cov';
    const npcMembers = save.covenantState.members.filter((member) => member.role === 'npc');
    const damageLog: CovenantNpcDamageEntry[] = [];

    for (const member of npcMembers) {
      const damage = computeNpcDailyDamage(dateKey, covId, member.id, member.resonancePower);
      if (damage <= 0) continue;

      const applied = CovBossSystem.applyDamage(save, damage, 'npc');
      if (applied > 0) {
        damageLog.push({
          memberId: member.id,
          memberName: member.name,
          damage: applied,
        });
      }
    }

    bossState.lastNpcDamageDate = dateKey;
    bossState.npcDamageToday = damageLog;
    return damageLog;
  }

  static getAttemptsRemaining(save: RealmSaveDataV3): number {
    if (!CovSystem.isInCovenant(save)) return 0;
    CovBossSystem.ensureCurrentWeek(save);
    return Math.max(0, WEEKLY_ATTEMPTS - save.covenantState.bossState.attemptsUsedThisWeek);
  }

  static canAttempt(save: RealmSaveDataV3, now = new Date()): { canAttempt: boolean; reason?: string } {
    if (!CovSystem.isInCovenant(save)) {
      return { canAttempt: false, reason: 'Join a Sect first' };
    }

    CovBossSystem.ensureCurrentWeek(save, now);
    CovBossSystem.syncNpcDamage(save, now);

    const bossState = save.covenantState.bossState;
    if (bossState.defeatedThisWeek || bossState.currentHp <= 0) {
      return { canAttempt: false, reason: 'Boss already defeated this week' };
    }

    if (CovBossSystem.getAttemptsRemaining(save) <= 0) {
      return { canAttempt: false, reason: 'No attempts remaining this week' };
    }

    return { canAttempt: true };
  }

  static attemptBoss(save: RealmSaveDataV3, now = new Date()): CovBossAttemptResult {
    const validation = CovBossSystem.canAttempt(save, now);
    if (!validation.canAttempt) {
      return { success: false, reason: validation.reason };
    }

    save.covenantState.bossState.attemptsUsedThisWeek += 1;
    return { success: true };
  }

  static computeBattleDamage(
    save: RealmSaveDataV3,
    won: boolean,
    wavesCleared: number,
    totalWaves: number,
  ): number {
    const bossState = save.covenantState.bossState;
    const boss = getCovenantBoss(bossState.bossId);
    const base = boss?.damagePerVictory ?? 120_000;

    if (won) return base;

    const ratio = totalWaves > 0 ? Math.min(1, wavesCleared / totalWaves) : 0;
    return Math.floor(base * 0.35 * ratio);
  }

  static resolveBattleResult(
    save: RealmSaveDataV3,
    won: boolean,
    wavesCleared: number,
    totalWaves: number,
  ): CovBossBattleResult {
    const damage = CovBossSystem.computeBattleDamage(save, won, wavesCleared, totalWaves);
    const damageDealt = CovBossSystem.applyDamage(save, damage, 'player');
    const rewardBundle = rollAttemptReward(save);
    RewardSystem.grantRewardBundle(save, rewardBundle);

    return {
      damageDealt,
      rewardBundle,
      bossDefeated: save.covenantState.bossState.defeatedThisWeek,
    };
  }

  /**
   * Applies damage to shared boss HP. Caps at remaining HP — no negative HP or overkill carryover.
   */
  static applyDamage(
    save: RealmSaveDataV3,
    amount: number,
    source: 'player' | 'npc' | 'dev',
  ): number {
    if (!CovSystem.isInCovenant(save) || amount <= 0) return 0;

    CovBossSystem.ensureBossState(save);
    const bossState = save.covenantState.bossState;
    if (bossState.defeatedThisWeek || bossState.currentHp <= 0) return 0;

    const effective = Math.min(amount, bossState.currentHp);
    bossState.currentHp -= effective;

    if (source === 'player' || source === 'dev') {
      bossState.playerDamageThisWeek += effective;
    }

    if (bossState.currentHp <= 0) {
      bossState.currentHp = 0;
      bossState.defeatedThisWeek = true;
      CovBossSystem.deliverKillCacheMail(save);
    }

    return effective;
  }

  static deliverKillCacheMail(save: RealmSaveDataV3): void {
    const bossState = save.covenantState.bossState;
    if (bossState.killRewardMailSent) return;

    bossState.killRewardMailSent = true;
    const boss = getCovenantBoss(bossState.bossId);
    const bundle = buildKillCacheBundle(save);

    createRewardMail(save, {
      fromName: 'Sect War Council',
      subject: `Boss Defeated: ${boss?.name ?? 'Sect Boss'}`,
      body: 'Your Sect brought down the weekly boss. Claim your share of the kill cache.',
      bundle,
    });
  }

  static getBossWaves(save: RealmSaveDataV3): ReturnType<typeof getCovenantBossWaves> {
    if (!CovSystem.isInCovenant(save)) return [];
    return getCovenantBossWaves(save.covenantState.bossState.bossId);
  }

  static getBossDefinition(save: RealmSaveDataV3) {
    if (!CovSystem.isInCovenant(save)) return null;
    return getCovenantBoss(save.covenantState.bossState.bossId);
  }
}
