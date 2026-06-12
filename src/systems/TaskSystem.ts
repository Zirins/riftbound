// src/systems/TaskSystem.ts
// Daily task progress, reset, and claims.

import { DAILY_TASKS } from '../data/tasks';
import type { DailyTaskState } from '../types';
import * as Economy from './EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from './SaveSystem';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildFreshTasks(date: string): DailyTaskState[] {
  return DAILY_TASKS.map((task) => ({
    taskId: task.id,
    currentProgress: 0,
    completed: false,
    claimed: false,
    date,
  }));
}

export function resetIfNewDay(): void {
  const realm = loadCurrentRealm();
  if (!realm) return;

  const today = todayString();
  const needsReset = realm.tasks.length === 0
    || realm.tasks.some((task) => task.date !== today);

  if (!needsReset) return;

  saveCurrentRealm({
    ...realm,
    tasks: buildFreshTasks(today),
  });
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

  saveCurrentRealm({ ...realm, tasks: updatedTasks });
}

export function claimTask(taskId: string): boolean {
  const realm = loadCurrentRealm();
  if (!realm) return false;

  const definition = DAILY_TASKS.find((t) => t.id === taskId);
  const task = realm.tasks.find((t) => t.taskId === taskId);

  if (!definition || !task || !task.completed || task.claimed) return false;

  Economy.grant(definition.reward.type, definition.reward.amount);

  const updatedRealm = loadCurrentRealm();
  if (!updatedRealm) return false;

  const updatedTasks = updatedRealm.tasks.map((t) => (
    t.taskId === taskId ? { ...t, claimed: true } : t
  ));

  saveCurrentRealm({ ...updatedRealm, tasks: updatedTasks });
  return true;
}

export function getTasksNotificationCount(): number {
  const tasks = getDailyTasks();
  const claimable = tasks.filter((t) => t.completed && !t.claimed).length;
  if (claimable > 0) return claimable;
  return tasks.filter((t) => !t.claimed && !t.completed).length > 0 ? 1 : 0;
}
