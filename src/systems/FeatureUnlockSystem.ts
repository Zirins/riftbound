// src/systems/FeatureUnlockSystem.ts
// Config-driven progressive feature unlock gates.

import { FEATURE_UNLOCKS } from '../constants/gameConfig';
import { loadCurrentRealm } from './SaveSystem';

export type FeatureKey = keyof typeof FEATURE_UNLOCKS;

const featureKeys = Object.keys(FEATURE_UNLOCKS) as FeatureKey[];

let previousUnlocks = new Set<FeatureKey>();
let snapshotInitialized = false;

export function isUnlocked(featureKey: FeatureKey): boolean {
  const gate = FEATURE_UNLOCKS[featureKey];
  if (gate.type === 'always') return true;

  if (gate.type === 'stage_clear') {
    const realm = loadCurrentRealm();
    return realm?.clearedStages.some((cs) => cs.stageId === gate.stageId) ?? false;
  }

  return false;
}

export function checkUnlocks(): FeatureKey[] {
  const currentlyUnlocked = featureKeys.filter((key) => isUnlocked(key));

  if (!snapshotInitialized) {
    previousUnlocks = new Set(currentlyUnlocked);
    snapshotInitialized = true;
    return [];
  }

  const newlyUnlocked = currentlyUnlocked.filter((key) => !previousUnlocks.has(key));
  previousUnlocks = new Set(currentlyUnlocked);
  return newlyUnlocked;
}
