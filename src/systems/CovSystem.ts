// src/systems/CovSystem.ts
// Covenant create/join/leave core (Section 25.1–25.3).

import { HEROES_DATA } from '../data/heroes';
import {
  NPC_COVENANT_MEMBERS,
  SIMULATED_COVENANT_PRESET,
} from '../data/npcCovenantMembers';
import { createDefaultCovenantState } from '../save/defaults/createDefaultCovenantState';
import type { CovenantMember, CovenantState, RealmSaveDataV3 } from '../types';
import { GameEventBus } from './GameEventBus';
import { computeRP } from './HeroProgressionSystem';

export interface CovenantActionResult {
  success: boolean;
  reason?: string;
  covId?: string;
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

export class CovSystem {
  static isInCovenant(save: RealmSaveDataV3): boolean {
    return save.covenantState?.covId != null;
  }

  static getState(save: RealmSaveDataV3): CovenantState {
    return save.covenantState ?? createDefaultCovenantState();
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
