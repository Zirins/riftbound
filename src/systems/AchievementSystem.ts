// src/systems/AchievementSystem.ts
// Achievement progress via GameEventBus + snapshot sync (Section 23).

import {
  ACHIEVEMENTS,
  getAchievementDefinition,
  type AchievementDefinition,
  type AchievementSnapshotMetric,
} from '../data/achievements';
import type {
  AchievementSaveState,
  GameEvent,
  RealmSaveDataV3,
} from '../types';
import { GameEventBus } from './GameEventBus';
import { RewardSystem } from './RewardSystem';

export interface AchievementClaimResult {
  success: boolean;
  reason?: string;
}

export interface AchievementViewState {
  id: string;
  visible: boolean;
  completed: boolean;
  claimed: boolean;
  currentProgress: number;
  targetProgress: number;
  name: string;
  description: string;
}

function ensureAchievementState(save: RealmSaveDataV3): AchievementSaveState {
  if (!save.achievementState.progressById) {
    save.achievementState = {
      ...save.achievementState,
      progressById: {},
    };
  }
  return save.achievementState;
}

function getTargetProgress(definition: AchievementDefinition): number {
  return definition.trigger.target;
}

function getSnapshotValue(save: RealmSaveDataV3, metric: AchievementSnapshotMetric): number {
  switch (metric) {
    case 'stages_cleared_unique':
      return save.clearedStages.length;
    case 'three_star_stages':
      return save.clearedStages.filter((record) => record.stars === 3).length;
    case 'heroes_owned':
      return save.ownedHeroes.filter((hero) => hero.isOwned).length;
    case 'account_level':
      return save.accountLevel;
    case 'sigils_owned':
      return save.sigilState?.ownedSigils?.length ?? 0;
    case 'highest_void_floor':
      return save.voidTrialState?.highestFloorCleared ?? 0;
    default:
      return 0;
  }
}

function eventMatchesTrigger(definition: AchievementDefinition, event: GameEvent): number {
  const trigger = definition.trigger;

  switch (trigger.kind) {
    case 'event_count':
      return event.type === trigger.event ? 1 : 0;
    case 'event_stars':
      return event.type === trigger.event && event.stars >= trigger.minStars ? 1 : 0;
    case 'event_swept':
      return event.type === trigger.event && event.swept ? 1 : 0;
    case 'event_rarity':
      return event.type === trigger.event && event.rarity === trigger.rarity ? 1 : 0;
    case 'event_sigil_rarity':
      return event.type === trigger.event && event.rarity === trigger.rarity ? 1 : 0;
    case 'event_void_floor':
      return event.type === trigger.event && event.floorNumber >= trigger.minFloor ? 1 : 0;
    case 'event_star_level':
      return event.type === trigger.event && event.newStar >= trigger.minStar ? 1 : 0;
    case 'event_awakening_level':
      return event.type === trigger.event && event.awakeningLevel >= trigger.minLevel ? 1 : 0;
    case 'snapshot':
      return 0;
    default:
      return 0;
  }
}

function applyProgress(
  state: AchievementSaveState,
  definition: AchievementDefinition,
  amount: number,
): void {
  if (amount <= 0) return;
  if (state.claimedAchievementIds.includes(definition.id)) return;

  const target = getTargetProgress(definition);
  const current = state.progressById[definition.id] ?? 0;
  const next = Math.min(target, current + amount);
  state.progressById[definition.id] = next;

  if (next >= target && !state.completedAchievementIds.includes(definition.id)) {
    state.completedAchievementIds = [...state.completedAchievementIds, definition.id];
  }
}

function applySnapshotProgress(save: RealmSaveDataV3, definition: AchievementDefinition): void {
  const trigger = definition.trigger;
  if (trigger.kind !== 'snapshot') return;

  const state = ensureAchievementState(save);
  const value = getSnapshotValue(save, trigger.metric);
  const target = trigger.target;
  state.progressById[definition.id] = Math.min(target, value);

  if (value >= target && !state.completedAchievementIds.includes(definition.id)) {
    state.completedAchievementIds = [...state.completedAchievementIds, definition.id];
  }
}

let handlersRegistered = false;

export class AchievementSystem {
  static init(): void {
    if (handlersRegistered) return;
    handlersRegistered = true;

    const eventTypes: GameEvent['type'][] = [
      'stage_cleared',
      'arena_won',
      'hero_summoned',
      'hero_star_up',
      'hero_awakened',
      'sigil_upgraded',
      'sigil_dissolved',
      'covenant_joined',
      'covenant_contributed',
      'friend_gift_sent',
      'rift_season_tier_claimed',
      'void_trial_floor_cleared',
    ];

    for (const type of eventTypes) {
      GameEventBus.register(type, AchievementSystem.handleEvent);
    }
  }

  static handleEvent(save: RealmSaveDataV3, event: GameEvent): void {
    const state = ensureAchievementState(save);

    for (const definition of ACHIEVEMENTS) {
      if (definition.trigger.kind === 'snapshot') continue;
      const increment = eventMatchesTrigger(definition, event);
      applyProgress(state, definition, increment);
    }

    AchievementSystem.syncSnapshotAchievements(save);
  }

  static syncSnapshotAchievements(save: RealmSaveDataV3): void {
    for (const definition of ACHIEVEMENTS) {
      if (definition.trigger.kind === 'snapshot') {
        applySnapshotProgress(save, definition);
      }
    }
  }

  static getProgress(save: RealmSaveDataV3, achievementId: string): number {
    const definition = getAchievementDefinition(achievementId);
    if (!definition) return 0;

    const state = ensureAchievementState(save);
    if (definition.trigger.kind === 'snapshot') {
      return Math.min(getTargetProgress(definition), getSnapshotValue(save, definition.trigger.metric));
    }

    return state.progressById[achievementId] ?? 0;
  }

  static isCompleted(save: RealmSaveDataV3, achievementId: string): boolean {
    return ensureAchievementState(save).completedAchievementIds.includes(achievementId);
  }

  static isClaimed(save: RealmSaveDataV3, achievementId: string): boolean {
    return ensureAchievementState(save).claimedAchievementIds.includes(achievementId);
  }

  static isVisible(save: RealmSaveDataV3, definition: AchievementDefinition): boolean {
    if (!definition.isHidden) return true;
    return AchievementSystem.isCompleted(save, definition.id);
  }

  static getUnclaimedCount(save: RealmSaveDataV3): number {
    const state = ensureAchievementState(save);
    return state.completedAchievementIds.filter(
      (id) => !state.claimedAchievementIds.includes(id),
    ).length;
  }

  static getViewState(save: RealmSaveDataV3, definition: AchievementDefinition): AchievementViewState {
    const completed = AchievementSystem.isCompleted(save, definition.id);
    const claimed = AchievementSystem.isClaimed(save, definition.id);
    const visible = AchievementSystem.isVisible(save, definition);
    const target = getTargetProgress(definition);

    return {
      id: definition.id,
      visible,
      completed,
      claimed,
      currentProgress: AchievementSystem.getProgress(save, definition.id),
      targetProgress: target,
      name: visible ? definition.name : '???',
      description: visible ? definition.description : definition.hiddenDescription,
    };
  }

  static claimAchievement(save: RealmSaveDataV3, achievementId: string): AchievementClaimResult {
    const definition = getAchievementDefinition(achievementId);
    if (!definition) {
      return { success: false, reason: 'Achievement not found' };
    }

    const state = ensureAchievementState(save);
    if (!state.completedAchievementIds.includes(achievementId)) {
      return { success: false, reason: 'Achievement not completed' };
    }

    if (state.claimedAchievementIds.includes(achievementId)) {
      return { success: false, reason: 'Achievement already claimed' };
    }

    RewardSystem.grantRewardBundle(save, definition.reward);
    state.claimedAchievementIds = [...state.claimedAchievementIds, achievementId];

    return { success: true };
  }
}
