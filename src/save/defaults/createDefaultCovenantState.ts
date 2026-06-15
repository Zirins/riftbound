// src/save/defaults/createDefaultCovenantState.ts

import type { CovenantState } from '../../types';
import { pickBossIdForWeek, getCovenantBoss } from '../../data/covenantBosses';
import { getIsoWeekKey } from '../utils/saveDateUtils';

export function createDefaultCovenantState(now = Date.now()): CovenantState {
  const weekKey = getIsoWeekKey(now);
  const bossId = pickBossIdForWeek(weekKey);
  const boss = getCovenantBoss(bossId);
  const maxHp = boss?.maxHp ?? 1_000_000;

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
      killRewardMailWeekKey: '',
    },
    shopState: {
      weekKey,
      purchasedItemCounts: {},
    },
  };
}
