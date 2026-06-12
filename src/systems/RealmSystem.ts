// src/systems/RealmSystem.ts
// Realm save initialization and delegation to SaveSystem.

import type { RealmSaveData } from '../types';
import { sendWelcomeMail } from './MailSystem';
import {
  buildDefaultSaveRoot,
  hasAnySave as saveHasAnySave,
  loadCurrentRealm as saveLoadCurrentRealm,
  saveCurrentRealm as saveSaveCurrentRealm,
  saveRoot,
} from './SaveSystem';

export function initNewSave(realmId: string, playerName: string): void {
  const root = buildDefaultSaveRoot(realmId, playerName.trim());
  saveRoot(root);
  sendWelcomeMail();
}

export function loadCurrentRealm(): RealmSaveData | null {
  return saveLoadCurrentRealm();
}

export function saveCurrentRealm(data: RealmSaveData): void {
  saveSaveCurrentRealm(data);
}

export function hasAnySave(): boolean {
  return saveHasAnySave();
}
