// src/systems/ArenaSeasonSystem.ts
// 30-day Arena seasons — rewards, soft reset, top-tier inactivity decay (Section 29).

import { ARENA_SEASON } from '../constants/gameConfig';
import { getArenaSeasonReward } from '../data/arenaSeasonRewards';
import { createDefaultArenaSeasonFields } from '../save/defaults/createDefaultArenaSeasonFields';
import {
  getLocalDateKey,
  getSeasonDay,
  isSeasonExpired,
  parseLocalDateKey,
} from '../save/utils/saveDateUtils';
import type { RealmSaveDataV3, RewardBundle } from '../types';
import { getTierFromPoints, getTierName } from './ArenaMatchSystem';
import { createRewardMail } from './MailSystem';

function daysBetween(startDateKey: string, endDateKey: string): number {
  const start = parseLocalDateKey(startDateKey);
  const end = parseLocalDateKey(endDateKey);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function clearInactivityDecayState(save: RealmSaveDataV3): void {
  save.arenaState.inactivityDecayBaseRankPoints = 0;
  save.arenaState.inactivityDecayMatchDate = '';
  save.arenaState.inactivityDecayThroughDate = '';
}

function ensureSeasonFields(save: RealmSaveDataV3, now = Date.now()): void {
  if (!save.arenaState.seasonStartDate || !save.arenaState.seasonEndDate) {
    const fields = createDefaultArenaSeasonFields(now);
    save.arenaState.seasonStartDate = fields.seasonStartDate;
    save.arenaState.seasonEndDate = fields.seasonEndDate;
  }
  if (save.arenaState.lastMatchDate === undefined) {
    save.arenaState.lastMatchDate = '';
  }
  if (save.arenaState.inactivityDecayBaseRankPoints === undefined) {
    save.arenaState.inactivityDecayBaseRankPoints = 0;
  }
  if (save.arenaState.inactivityDecayMatchDate === undefined) {
    save.arenaState.inactivityDecayMatchDate = '';
  }
  if (save.arenaState.inactivityDecayThroughDate === undefined) {
    save.arenaState.inactivityDecayThroughDate = '';
  }
}

function startNewSeason(save: RealmSaveDataV3, now = Date.now()): void {
  const fields = createDefaultArenaSeasonFields(now);
  save.arenaState.seasonStartDate = fields.seasonStartDate;
  save.arenaState.seasonEndDate = fields.seasonEndDate;
}

/**
 * Inactive weeks beyond the 7-day grace period.
 * Day 7–14 → 1 step (×0.95); day 15–21 → 2 steps; etc.
 * One decay step per full 7-day block after the grace week ends.
 */
export function computeInactiveWeeks(daysSinceLastMatch: number): number {
  if (daysSinceLastMatch < ARENA_SEASON.INACTIVITY_THRESHOLD_DAYS) return 0;

  const weeksBeyondGrace = daysSinceLastMatch - ARENA_SEASON.INACTIVITY_THRESHOLD_DAYS;
  return Math.max(1, Math.ceil(weeksBeyondGrace / 7));
}

/**
 * Top-tier inactivity decay (Rift Vanguard+ only).
 * Computes target RP from a fixed baseline — never chains off already-decayed RP.
 */
export function computeInactivityDecay(
  baselineRankPoints: number,
  lastMatchDate: string,
  now = new Date(),
): number {
  if (baselineRankPoints < ARENA_SEASON.TOP_TIER_MIN_POINTS) return baselineRankPoints;
  if (!lastMatchDate) return baselineRankPoints;

  const today = getLocalDateKey(now);
  const daysSince = daysBetween(lastMatchDate, today);
  const inactiveWeeks = computeInactiveWeeks(daysSince);
  if (inactiveWeeks === 0) return baselineRankPoints;

  const multiplier = Math.pow(1 - ARENA_SEASON.INACTIVITY_DECAY_PER_WEEK, inactiveWeeks);
  const decayed = Math.floor(baselineRankPoints * multiplier);
  const tierFloor = getTierFromPoints(baselineRankPoints).minPoints;

  return Math.max(tierFloor, decayed);
}

export class ArenaSeasonSystem {
  static ensureSeasonState(save: RealmSaveDataV3, now = Date.now()): void {
    ensureSeasonFields(save, now);
  }

  static getSeasonDay(save: RealmSaveDataV3, now = new Date()): number {
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());
    return getSeasonDay(save.arenaState.seasonStartDate, now);
  }

  static getDaysRemaining(save: RealmSaveDataV3, now = new Date()): number {
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());
    const seasonDay = ArenaSeasonSystem.getSeasonDay(save, now);
    return Math.max(0, ARENA_SEASON.SEASON_DURATION_DAYS - seasonDay + 1);
  }

  static applyInactivityDecay(save: RealmSaveDataV3, now = new Date()): number {
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());

    const { lastMatchDate } = save.arenaState;
    const today = getLocalDateKey(now);

    if (!lastMatchDate || !ArenaSeasonSystem.isTopTier(save.arenaState.rankPoints)) {
      clearInactivityDecayState(save);
      return save.arenaState.rankPoints;
    }

    const daysSince = daysBetween(lastMatchDate, today);
    if (daysSince < ARENA_SEASON.INACTIVITY_THRESHOLD_DAYS) {
      clearInactivityDecayState(save);
      return save.arenaState.rankPoints;
    }

    if (save.arenaState.inactivityDecayMatchDate !== lastMatchDate) {
      save.arenaState.inactivityDecayBaseRankPoints = save.arenaState.rankPoints;
      save.arenaState.inactivityDecayMatchDate = lastMatchDate;
      save.arenaState.inactivityDecayThroughDate = '';
    }

    if (save.arenaState.inactivityDecayThroughDate === today) {
      return save.arenaState.rankPoints;
    }

    const baseline = save.arenaState.inactivityDecayBaseRankPoints > 0
      ? save.arenaState.inactivityDecayBaseRankPoints
      : save.arenaState.rankPoints;

    const after = computeInactivityDecay(baseline, lastMatchDate, now);
    const before = save.arenaState.rankPoints;

    save.arenaState.rankPoints = after;
    save.arenaState.rankTier = getTierFromPoints(after).id;
    save.arenaState.inactivityDecayBaseRankPoints = baseline;
    save.arenaState.inactivityDecayThroughDate = today;

    if (import.meta.env.DEV && after !== before) {
      console.info('[ArenaSeasonSystem] inactivity decay', {
        before,
        after,
        baseline,
        inactiveWeeks: computeInactiveWeeks(daysSince),
        lastMatchDate,
        throughDate: today,
      });
    }

    return after;
  }

  static recordMatchPlayed(save: RealmSaveDataV3, now = new Date()): void {
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());
    save.arenaState.lastMatchDate = getLocalDateKey(now);
    clearInactivityDecayState(save);
  }

  static buildSeasonRewardMail(tierId: string): { subject: string; body: string; bundle: RewardBundle } {
    const tierName = getTierName(tierId);
    const bundle = getArenaSeasonReward(tierId);

    return {
      subject: `Arena Season Complete — ${tierName}`,
      body: `Your ${tierName} season has ended. Claim your season rewards.`,
      bundle,
    };
  }

  static deliverSeasonRewardMail(save: RealmSaveDataV3, tierId: string): void {
    const mail = ArenaSeasonSystem.buildSeasonRewardMail(tierId);
    createRewardMail(save, {
      fromName: 'Resonance Arena',
      subject: mail.subject,
      body: mail.body,
      bundle: mail.bundle,
    });
  }

  /** Called by ResetService on every hub load — decay check + season rollover if expired. */
  static rolloverIfExpired(save: RealmSaveDataV3, now = new Date()): boolean {
    ArenaSeasonSystem.ensureSeasonState(save, now.getTime());
    ArenaSeasonSystem.applyInactivityDecay(save, now);

    if (!isSeasonExpired(save.arenaState.seasonEndDate, now)) {
      return false;
    }

    const tier = getTierFromPoints(save.arenaState.rankPoints);
    const pointsBeforeReset = save.arenaState.rankPoints;

    ArenaSeasonSystem.deliverSeasonRewardMail(save, tier.id);

    const softResetPoints = Math.floor(pointsBeforeReset * ARENA_SEASON.SOFT_RESET_RATIO);
    save.arenaState.rankPoints = softResetPoints;
    save.arenaState.rankTier = getTierFromPoints(softResetPoints).id;
    startNewSeason(save, now.getTime());

    save.arenaState.inactivityDecayBaseRankPoints = softResetPoints;
    save.arenaState.inactivityDecayMatchDate = save.arenaState.lastMatchDate;
    save.arenaState.inactivityDecayThroughDate = getLocalDateKey(now);

    if (import.meta.env.DEV) {
      console.info('[ArenaSeasonSystem] season rollover', {
        endedTier: tier.id,
        pointsBeforeReset,
        softResetPoints,
        newSeasonStart: save.arenaState.seasonStartDate,
        newSeasonEnd: save.arenaState.seasonEndDate,
      });
    }

    return true;
  }

  static isTopTier(rankPoints: number): boolean {
    return rankPoints >= ARENA_SEASON.TOP_TIER_MIN_POINTS;
  }
}
