// src/systems/CovSystem.ts
// Covenant create/join/leave and daily contribution (Section 25.1–25.4).

import {
  CONTRIBUTION_FLAG_CRYSTAL,
  CONTRIBUTION_FLAG_GOLD,
  COVENANT_CONTRIBUTION,
} from '../data/covenantContribution';
import { getCovenantLevelProgress } from '../data/covenantLevels';
import { HEROES_DATA } from '../data/heroes';
import {
  NPC_COVENANT_MEMBERS,
  SIMULATED_COVENANT_PRESET,
} from '../data/npcCovenantMembers';
import { createDefaultCovenantState } from '../save/defaults/createDefaultCovenantState';
import { getLocalDateKey } from '../save/utils/saveDateUtils';
import type { CovenantMember, CovenantState, CurrencyType, RealmSaveDataV3 } from '../types';
import { CovTechSystem } from './CovTechSystem';
import { EconomySystem } from './EconomySystem';
import { GameEventBus } from './GameEventBus';
import { computeRP } from './HeroProgressionSystem';

export interface CovenantActionResult {
  success: boolean;
  reason?: string;
  covId?: string;
}

export interface ContributionResult extends CovenantActionResult {
  coinsGranted?: number;
  xpGranted?: number;
}

export interface ContributionAvailability {
  canContributeGold: boolean;
  canContributeCrystal: boolean;
  goldReason?: string;
  crystalReason?: string;
}

function computePlayerResonancePower(save: RealmSaveDataV3): number {
  let total = 0;
  for (const slot of save.currentFormation.slots) {
    if (!slot.assignedHeroId) continue;
    const owned = save.ownedHeroes.find((hero) => hero.heroId === slot.assignedHeroId);
    const heroData = HEROES_DATA.find((hero) => hero.id === slot.assignedHeroId);
    if (owned && heroData) total += computeRP(owned, heroData);
  }
  return total;
}

function buildPlayerMember(
  save: RealmSaveDataV3,
  role: 'leader' | 'member',
): CovenantMember {
  return {
    id: save.realmId,
    name: save.playerName,
    role,
    resonancePower: computePlayerResonancePower(save),
    lastActiveText: 'Now',
    weeklyContribution: 0,
  };
}

function cloneNpcMembers(): CovenantMember[] {
  return NPC_COVENANT_MEMBERS.map((member) => ({ ...member }));
}

function emitCovenantJoined(save: RealmSaveDataV3, covenantId: string): void {
  GameEventBus.emit(save, { type: 'covenant_joined', covenantId });
}

function syncContributionDay(state: CovenantState): void {
  const today = getLocalDateKey();
  if (state.lastContributionDate && state.lastContributionDate !== today) {
    state.personalContributionToday = 0;
  }
}

function bumpPlayerWeeklyContribution(save: RealmSaveDataV3): void {
  const state = save.covenantState;
  if (!state) return;

  const player = state.members.find((member) => member.id === save.realmId);
  if (player) {
    player.weeklyContribution += 1;
  }
}

function applyCovenantXp(save: RealmSaveDataV3, amount: number): void {
  const state = save.covenantState;
  if (!state) return;

  state.covXP += amount;
  CovTechSystem.recalculateLevel(save);
}

export class CovSystem {
  static isInCovenant(save: RealmSaveDataV3): boolean {
    return save.covenantState?.covId != null;
  }

  static getState(save: RealmSaveDataV3): CovenantState {
    const state = save.covenantState ?? createDefaultCovenantState();
    syncContributionDay(state);
    return state;
  }

  static syncDailyContribution(save: RealmSaveDataV3): void {
    if (!save.covenantState) return;
    syncContributionDay(save.covenantState);
  }

  static resetDailyContribution(save: RealmSaveDataV3, dateKey: string): void {
    if (!save.covenantState) return;
    if (save.covenantState.lastContributionDate === dateKey) return;
    save.covenantState.personalContributionToday = 0;
  }

  static getContributionAvailability(save: RealmSaveDataV3): ContributionAvailability {
    if (!CovSystem.isInCovenant(save)) {
      return {
        canContributeGold: false,
        canContributeCrystal: false,
        goldReason: 'Join a Sect first',
        crystalReason: 'Join a Sect first',
      };
    }

    const state = CovSystem.getState(save);
    const flags = state.personalContributionToday;

    let canContributeGold = (flags & CONTRIBUTION_FLAG_GOLD) === 0;
    let canContributeCrystal = (flags & CONTRIBUTION_FLAG_CRYSTAL) === 0;
    let goldReason: string | undefined;
    let crystalReason: string | undefined;

    if (!canContributeGold) goldReason = 'Already contributed Gold today';
    if (!canContributeCrystal) crystalReason = 'Already contributed Crystals today';

    if (canContributeGold
      && EconomySystem.getCurrencyBalance(save, 'gold') < COVENANT_CONTRIBUTION.GOLD_COST) {
      canContributeGold = false;
      goldReason = `Need ${COVENANT_CONTRIBUTION.GOLD_COST.toLocaleString()} Gold`;
    }

    if (canContributeCrystal
      && EconomySystem.getCurrencyBalance(save, 'rift_crystal') < COVENANT_CONTRIBUTION.CRYSTAL_COST) {
      canContributeCrystal = false;
      crystalReason = `Need ${COVENANT_CONTRIBUTION.CRYSTAL_COST} Rift Crystals`;
    }

    return {
      canContributeGold,
      canContributeCrystal,
      goldReason,
      crystalReason,
    };
  }

  static getLevelProgress(save: RealmSaveDataV3) {
    const state = CovSystem.getState(save);
    return getCovenantLevelProgress(state.covXP, state.covLevel);
  }

  static contributeGold(save: RealmSaveDataV3): ContributionResult {
    return CovSystem.contribute(save, 'gold');
  }

  static contributeCrystals(save: RealmSaveDataV3): ContributionResult {
    return CovSystem.contribute(save, 'rift_crystal');
  }

  private static contribute(
    save: RealmSaveDataV3,
    currency: Extract<CurrencyType, 'gold' | 'rift_crystal'>,
  ): ContributionResult {
    if (!CovSystem.isInCovenant(save)) {
      return { success: false, reason: 'Not in a Sect' };
    }

    const state = CovSystem.getState(save);
    const availability = CovSystem.getContributionAvailability(save);
    const isGold = currency === 'gold';
    const flag = isGold ? CONTRIBUTION_FLAG_GOLD : CONTRIBUTION_FLAG_CRYSTAL;

    if (isGold && !availability.canContributeGold) {
      return { success: false, reason: availability.goldReason ?? 'Gold contribution unavailable' };
    }

    if (!isGold && !availability.canContributeCrystal) {
      return {
        success: false,
        reason: availability.crystalReason ?? 'Crystal contribution unavailable',
      };
    }

    const cost = isGold
      ? COVENANT_CONTRIBUTION.GOLD_COST
      : COVENANT_CONTRIBUTION.CRYSTAL_COST;
    const baseCoins = isGold
      ? COVENANT_CONTRIBUTION.GOLD_COINS
      : COVENANT_CONTRIBUTION.CRYSTAL_COINS;
    const xpGain = isGold
      ? COVENANT_CONTRIBUTION.GOLD_XP
      : COVENANT_CONTRIBUTION.CRYSTAL_XP;

    const spend = EconomySystem.spendCurrency(save, currency, cost, 'covenant_contribution');
    if (!spend.success) {
      return { success: false, reason: spend.reason ?? 'Insufficient currency' };
    }

    const coinsGranted = CovTechSystem.scaleCovenantCoinGrant(save, baseCoins);
    EconomySystem.grantCurrency(save, 'covenant_coin', coinsGranted, 'covenant_contribution');
    state.covCoins += coinsGranted;

    applyCovenantXp(save, xpGain);
    state.personalContributionToday |= flag;
    state.lastContributionDate = getLocalDateKey();
    bumpPlayerWeeklyContribution(save);

    GameEventBus.emit(save, { type: 'covenant_contributed', amount: cost, currency });

    return { success: true, coinsGranted, xpGranted: xpGain };
  }

  static createCovenant(save: RealmSaveDataV3, covName: string): CovenantActionResult {
    const trimmed = covName.trim();
    if (trimmed.length < 2) {
      return { success: false, reason: 'Sect name must be at least 2 characters' };
    }

    if (CovSystem.isInCovenant(save)) {
      return { success: false, reason: 'Already in a Sect' };
    }

    const defaults = createDefaultCovenantState();
    const covId = `cov_${save.realmId}_${Date.now()}`;
    const player = buildPlayerMember(save, 'leader');

    save.covenantState = {
      ...defaults,
      covId,
      covName: trimmed,
      covLevel: 1,
      covXP: 0,
      memberCount: 1,
      members: [player],
    };

    emitCovenantJoined(save, covId);
    return { success: true, covId };
  }

  static joinSimulatedCovenant(save: RealmSaveDataV3): CovenantActionResult {
    if (CovSystem.isInCovenant(save)) {
      return { success: false, reason: 'Already in a Sect' };
    }

    const defaults = createDefaultCovenantState();
    const player = buildPlayerMember(save, 'member');
    const npcMembers = cloneNpcMembers();
    const members = [...npcMembers, player];
    const { covId, covName, covLevel, covXP } = SIMULATED_COVENANT_PRESET;

    save.covenantState = {
      ...defaults,
      covId,
      covName,
      covLevel,
      covXP,
      memberCount: members.length,
      members,
    };
    CovTechSystem.recalculateLevel(save);

    emitCovenantJoined(save, covId);
    return { success: true, covId };
  }

  static leaveCovenant(save: RealmSaveDataV3): CovenantActionResult {
    if (!CovSystem.isInCovenant(save)) {
      return { success: false, reason: 'Not in a Sect' };
    }

    save.covenantState = createDefaultCovenantState();
    return { success: true };
  }

  static sortMembers(members: CovenantMember[]): CovenantMember[] {
    const roleOrder = (role: CovenantMember['role']): number => {
      if (role === 'leader') return 0;
      if (role === 'member') return 1;
      return 2;
    };

    return [...members].sort((left, right) => {
      const roleDiff = roleOrder(left.role) - roleOrder(right.role);
      if (roleDiff !== 0) return roleDiff;

      if (right.weeklyContribution !== left.weeklyContribution) {
        return right.weeklyContribution - left.weeklyContribution;
      }

      return right.resonancePower - left.resonancePower;
    });
  }
}
