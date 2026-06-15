// src/systems/TaskSystem.ts
// Daily task progress, reset, and claims.

import { DAILY_TASKS } from '../data/tasks';
import type { DailyTaskState, RealmSaveDataV3 } from '../types';
import { getLocalDateKey } from '../save/utils/saveDateUtils';
import { GameEventBus } from './GameEventBus';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';
import { WeeklyTaskSystem } from './WeeklyTaskSystem';
import { RewardSystem } from './RewardSystem';

function buildFreshTasks(date: string): DailyTaskState[] {
  return DAILY_TASKS.map((task) => ({
    taskId: task.id,
    currentProgress: 0,
    completed: false,
    claimed: false,
    date,
  }));
}

export function resetDaily(save: RealmSaveDataV3, dateKey: string): void {
  const needsReset = save.tasks.length === 0
    || save.tasks.some((task) => task.date !== dateKey);

  if (!needsReset) return;

  save.tasks = buildFreshTasks(dateKey);
}

export function resetIfNewDay(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const save = realm as RealmSaveDataV3;
  const dateKey = getLocalDateKey();
  if (save.tasks.length > 0 && save.tasks.every((task) => task.date === dateKey)) {
    return;
  }

  resetDaily(save, dateKey);
  saveCurrentRealm(save);
}

export function getDailyTasks(): DailyTaskState[] {
  const realm = loadCurrentRealm();
  if (!realm) return [];
  return realm.tasks;
}

export function reportProgress(taskId: string, increment: number): void {
  if (increment <= 0) return;

  const realm = loadCurrentRealm();
  if (!realm) return;

  const definition = DAILY_TASKS.find((t) => t.id === taskId);
  if (!definition) return;

  const updatedTasks = realm.tasks.map((task) => {
    if (task.taskId !== taskId || task.claimed) return task;

    const currentProgress = task.currentProgress + increment;
    const completed = currentProgress >= definition.requiredProgress;

    return {
      ...task,
      currentProgress,
      completed,
    };
  });

  const updatedSave = { ...realm, tasks: updatedTasks } as RealmSaveDataV3;

  for (const task of updatedTasks) {
    const before = realm.tasks.find((entry) => entry.taskId === task.taskId);
    if (before && !before.completed && task.completed) {
      GameEventBus.emit(updatedSave, { type: 'daily_task_completed', taskId: task.taskId });
    }
  }

  WeeklyTaskSystem.checkDisciplinedRoutine(updatedSave);
  saveCurrentRealm(updatedSave);
}

export function claimTask(taskId: string): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const definition = DAILY_TASKS.find((t) => t.id === taskId);
  const task = realm.tasks.find((t) => t.taskId === taskId);

  if (!definition || !task || !task.completed || task.claimed) return false;

  const updatedSave = loadCurrentRealm() as RealmSaveDataV3 | null;
  if (!updatedSave) return false;

  RewardSystem.grantRewardBundle(updatedSave, {
    source: 'daily_task',
    currencies: definition.reward.type === 'xpFragments'
      ? undefined
      : [{
        type: definition.reward.type === 'crystals'
          ? 'rift_crystal'
          : definition.reward.type === 'energy'
            ? 'energy'
            : 'gold',
        amount: definition.reward.amount,
      }],
    items: definition.reward.type === 'xpFragments'
      ? [{ itemId: 'xp_fragment', quantity: definition.reward.amount }]
      : undefined,
  });

  const updatedTasks = updatedSave.tasks.map((t) => (
    t.taskId === taskId ? { ...t, claimed: true } : t
  ));

  updatedSave.tasks = updatedTasks;
  WeeklyTaskSystem.checkDisciplinedRoutine(updatedSave);
  saveCurrentRealm(updatedSave);
  return true;
}

export function claimAllCompletedTasks(): number {
  const realm = loadCurrentRealm();
  if (!realm) return 0;

  const claimable = realm.tasks.filter((t) => t.completed && !t.claimed).map((t) => t.taskId);
  if (claimable.length === 0) return 0;

  let claimedCount = 0;
  for (const taskId of claimable) {
    if (claimTask(taskId)) claimedCount += 1;
  }
  return claimedCount;
}

export function getTasksNotificationCount(): number {
  const realm = loadCurrentRealm();
  const tasks = realm?.tasks ?? [];
  const dailyClaimable = tasks.filter((t) => t.completed && !t.claimed).length;
  const weeklyClaimable = realm
    ? WeeklyTaskSystem.getUnclaimedCount(realm as RealmSaveDataV3)
    : 0;

  if (dailyClaimable + weeklyClaimable > 0) {
    return dailyClaimable + weeklyClaimable;
  }

  const dailyIncomplete = tasks.filter((t) => !t.claimed && !t.completed).length;
  return dailyIncomplete > 0 ? 1 : 0;
}
