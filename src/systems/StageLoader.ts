// src/systems/StageLoader.ts
// Stage data lookup and unlock checks.

import { STAGES } from '../data/stages';
import type { ClearedStageRecord, StageData } from '../types';

export function getStageData(stageId: string): StageData | undefined {
  return STAGES.find((stage) => stage.id === stageId);
}

export function isUnlocked(stageId: string, clearedStages: ClearedStageRecord[]): boolean {
  const stage = getStageData(stageId);
  if (!stage) return false;
  if (!stage.unlockCondition) return true;
  return clearedStages.some((record) => record.stageId === stage.unlockCondition);
}
