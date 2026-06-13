// src/save/defaults/createDefaultCovenantState.ts

import type { CovenantState } from '../../types';
import { getIsoWeekKey } from '../utils/saveDateUtils';

const DEFAULT_BOSS_ID = 'void_colossus';
const DEFAULT_BOSS_HP = 1_000_000;

export function createDefaultCovenantState(now = Date.now()): CovenantState {
  const weekKey = getIsoWeekKey(now);
  return {
    covId: null,
    covName: null,
    covLevel: 1,
    covXP: 0,
    memberCount: 0,
    members: [],
    personalContributionToday: 0,
    lastContributionDate: '',
    covCoins: 0,
    bossState: {
      bossId: DEFAULT_BOSS_ID,
      currentHp: DEFAULT_BOSS_HP,
      maxHp: DEFAULT_BOSS_HP,
      attemptsUsedThisWeek: 0,
      lastWeeklyResetWeekKey: weekKey,
      defeatedThisWeek: false,
    },
    shopState: {
      weekKey,
      purchasedItemCounts: {},
    },
  };
}
