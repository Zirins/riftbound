// src/systems/WeeklyTaskSystem.ts
// Weekly mission progress, reset, and claims (Section 24.2).

import {
  WEEKLY_MISSIONS,
  getWeeklyMissionDefinition,
  isWeeklyMissionActive,
  type WeeklyMissionDefinition,
} from '../data/weeklyTasks';
import {
  buildFreshWeeklyTaskEntries,
  createDefaultWeeklyTaskState,
} from '../save/defaults/createDefaultWeeklyTaskState';
import { getLocalDateKey, getLocalWeekKey } from '../save/utils/saveDateUtils';
import type { GameEvent, RealmSaveDataV3, WeeklyTaskEntry, WeeklyTaskSaveState } from '../types';
import { GameEventBus } from './GameEventBus';
import { RewardSystem } from './RewardSystem';
import { loadCurrentRealm } from './SaveSystem';

export interface WeeklyMissionClaimResult {
  success: boolean;
  reason?: string;
}

export interface WeeklyMissionViewState {
  id: string;
  name: string;
  description: string;
  requiredProgress: number;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
  locked: boolean;
  lockReason?: string;
}

function ensureWeeklyTaskState(save: RealmSaveDataV3): WeeklyTaskSaveState {
  if (!save.weeklyTaskState) {
    save.weeklyTaskState = createDefaultWeeklyTaskState();
  }

  if (!save.weeklyTaskState.disciplinedRoutineDayKeys) {
    save.weeklyTaskState.disciplinedRoutineDayKeys = [];
  }

  for (const mission of WEEKLY_MISSIONS) {
    const existing = save.weeklyTaskState.tasks.find((task) => task.taskId === mission.id);
    if (!existing) {
      save.weeklyTaskState.tasks.push({
        taskId: mission.id,
        currentProgress: 0,
        completed: false,
        claimed: false,
      });
    }
  }

  return save.weeklyTaskState;
}

function findTaskEntry(state: WeeklyTaskSaveState, missionId: string): WeeklyTaskEntry | undefined {
  return state.tasks.find((task) => task.taskId === missionId);
}

function applyMissionProgress(
  save: RealmSaveDataV3,
  missionId: string,
  increment: number,
): void {
  if (increment <= 0) return;
  if (!isWeeklyMissionActive(missionId)) return;

  const definition = getWeeklyMissionDefinition(missionId);
  if (!definition) return;

  const state = ensureWeeklyTaskState(save);
  const entry = findTaskEntry(state, missionId);
  if (!entry || entry.claimed) return;

  const next = Math.min(definition.requiredProgress, entry.currentProgress + increment);
  entry.currentProgress = next;
  entry.completed = next >= definition.requiredProgress;
}

function syncDisciplinedRoutineProgress(save: RealmSaveDataV3): void {
  const state = ensureWeeklyTaskState(save);
  const entry = findTaskEntry(state, 'weekly_disciplined_routine');
  const definition = getWeeklyMissionDefinition('weekly_disciplined_routine');
  if (!entry || !definition || entry.claimed) return;

  const days = state.disciplinedRoutineDayKeys.length;
  entry.currentProgress = Math.min(definition.requiredProgress, days);
  entry.completed = entry.currentProgress >= definition.requiredProgress;
}

let handlersRegistered = false;

export class WeeklyTaskSystem {
  static init(): void {
    if (handlersRegistered) return;
    handlersRegistered = true;

    const eventTypes: GameEvent['type'][] = [
      'stage_cleared',
      'arena_won',
      'sigil_upgraded',
      'covenant_contributed',
    ];

    for (const type of eventTypes) {
      GameEventBus.register(type, WeeklyTaskSystem.handleEvent);
    }
  }

  static handleEvent(save: RealmSaveDataV3, event: GameEvent): void {
    WeeklyTaskSystem.ensureCurrentWeek(save);

    switch (event.type) {
      case 'stage_cleared':
        applyMissionProgress(save, 'weekly_campaign_regular', 1);
        break;
      case 'arena_won':
        applyMissionProgress(save, 'weekly_arena_competitor', 1);
        break;
      case 'sigil_upgraded':
        applyMissionProgress(save, 'weekly_sigil_forger', 1);
        break;
      case 'covenant_contributed':
        applyMissionProgress(save, 'weekly_covenant_supporter', 1);
        break;
      default:
        break;
    }
  }

  static ensureCurrentWeek(save: RealmSaveDataV3, now = new Date()): void {
    const currentWeek = getLocalWeekKey(now);
    if (save.weeklyTaskState?.weekKey !== currentWeek) {
      WeeklyTaskSystem.resetWeekly(save, currentWeek);
      return;
    }
    ensureWeeklyTaskState(save);
  }

  static resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
    if (save.weeklyTaskState?.weekKey === weekKey) return;

    save.weeklyTaskState = {
      weekKey,
      tasks: buildFreshWeeklyTaskEntries(),
      disciplinedRoutineDayKeys: [],
    };
  }

  static checkDisciplinedRoutine(save: RealmSaveDataV3): void {
    if (!isWeeklyMissionActive('weekly_disciplined_routine')) return;

    WeeklyTaskSystem.ensureCurrentWeek(save);

    const allComplete = save.tasks.length > 0 && save.tasks.every((task) => task.completed);
    if (!allComplete) return;

    const state = ensureWeeklyTaskState(save);
    const dateKey = getLocalDateKey();
    if (state.disciplinedRoutineDayKeys.includes(dateKey)) return;

    state.disciplinedRoutineDayKeys = [...state.disciplinedRoutineDayKeys, dateKey];
    syncDisciplinedRoutineProgress(save);
  }

  static getWeeklyTasks(save: RealmSaveDataV3): WeeklyTaskEntry[] {
    WeeklyTaskSystem.ensureCurrentWeek(save);
    return ensureWeeklyTaskState(save).tasks;
  }

  static getViewState(save: RealmSaveDataV3, definition: WeeklyMissionDefinition): WeeklyMissionViewState {
    WeeklyTaskSystem.ensureCurrentWeek(save);
    const state = ensureWeeklyTaskState(save);
    const entry = findTaskEntry(state, definition.id);
    const locked = definition.availability === 'locked';

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      requiredProgress: definition.requiredProgress,
      currentProgress: locked ? 0 : (entry?.currentProgress ?? 0),
      completed: locked ? false : (entry?.completed ?? false),
      claimed: entry?.claimed ?? false,
      locked,
      lockReason: definition.lockReason,
    };
  }

  static getUnclaimedCount(save: RealmSaveDataV3): number {
    return WEEKLY_MISSIONS.filter((mission) => {
      if (!isWeeklyMissionActive(mission.id)) return false;
      const view = WeeklyTaskSystem.getViewState(save, mission);
      return view.completed && !view.claimed;
    }).length;
  }

  static claimMission(save: RealmSaveDataV3, missionId: string): WeeklyMissionClaimResult {
    const definition = getWeeklyMissionDefinition(missionId);
    if (!definition) {
      return { success: false, reason: 'Mission not found' };
    }

    if (!isWeeklyMissionActive(missionId)) {
      return { success: false, reason: definition.lockReason ?? 'Mission is locked' };
    }

    WeeklyTaskSystem.ensureCurrentWeek(save);
    const state = ensureWeeklyTaskState(save);
    const entry = findTaskEntry(state, missionId);

    if (!entry || !entry.completed) {
      return { success: false, reason: 'Mission not completed' };
    }

    if (entry.claimed) {
      return { success: false, reason: 'Mission already claimed' };
    }

    RewardSystem.grantRewardBundle(save, definition.reward);
    entry.claimed = true;

    return { success: true };
  }

  static getWeekKey(save: RealmSaveDataV3): string {
    return ensureWeeklyTaskState(save).weekKey;
  }

  static getLockedMissions(): WeeklyMissionDefinition[] {
    return WEEKLY_MISSIONS.filter((mission) => mission.availability === 'locked');
  }
}

export function resetWeekly(save: RealmSaveDataV3, weekKey: string): void {
  WeeklyTaskSystem.resetWeekly(save, weekKey);
}

export function getWeeklyTasksFromCurrentRealm(): WeeklyTaskEntry[] {
  const realm = loadCurrentRealm();
  if (!realm) return [];
  return WeeklyTaskSystem.getWeeklyTasks(realm as RealmSaveDataV3);
}
