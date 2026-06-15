// src/systems/FriendSystem.ts
// NPC friends, daily energy gifts, and Friendship Points (Section 28).

import { getNpcFriend, NPC_FRIENDS } from '../data/npcFriends';
import type { NpcFriendProfile } from '../data/npcFriends';
import type { RealmSaveDataV3 } from '../types';
import { EconomySystem } from './EconomySystem';
import { FriendShopSystem } from './FriendShopSystem';
import { GameEventBus } from './GameEventBus';
import { ResetService } from './ResetService';

export const MAX_FRIENDS = 20;
export const ENERGY_PER_GIFT = 5;
export const FRIENDSHIP_POINTS_PER_GIFT = 1;

export interface FriendActionResult {
  success: boolean;
  reason?: string;
}

export interface FriendGiftClaimSummary {
  success: boolean;
  claimedCount: number;
  energyGranted: number;
  friendshipPointsGranted: number;
  reason?: string;
}

export interface FriendListEntry {
  profile: NpcFriendProfile;
  sentToday: boolean;
  receivedToday: boolean;
  canSend: boolean;
  canReceive: boolean;
}

function syncFriendshipPointsMirror(save: RealmSaveDataV3): void {
  save.friendState.friendshipPoints = EconomySystem.getCurrencyBalance(save, 'friendship_point');
}

function ensureDailySync(save: RealmSaveDataV3, now = new Date()): void {
  const dateKey = ResetService.getLocalDateKey(now);
  if (save.friendState.lastGiftResetDate !== dateKey) {
    FriendSystem.resetDailyGifts(save, dateKey);
  }
}

export class FriendSystem {
  static syncResets(save: RealmSaveDataV3, now = new Date()): void {
    ResetService.runDueResets(save, now);
    ensureDailySync(save, now);
    FriendShopSystem.ensureCurrentWeek(save, now);
    syncFriendshipPointsMirror(save);
  }

  /** Unconditional daily reset — clears sent/received gift flags. */
  static resetDailyGifts(save: RealmSaveDataV3, dateKey: string): void {
    const previousDate = save.friendState.lastGiftResetDate;

    save.friendState.sentGiftToday = [];
    save.friendState.receivedGiftToday = [];
    save.friendState.lastGiftResetDate = dateKey;

    if (import.meta.env.DEV) {
      console.info('[FriendSystem] resetDailyGifts', { previousDate, dateKey });
    }
  }

  static getFriendshipPoints(save: RealmSaveDataV3): number {
    return EconomySystem.getCurrencyBalance(save, 'friendship_point');
  }

  static getAddedFriends(save: RealmSaveDataV3): NpcFriendProfile[] {
    return save.friendState.friendIds
      .map((id) => getNpcFriend(id))
      .filter((profile): profile is NpcFriendProfile => profile !== null);
  }

  static getAvailableToAdd(save: RealmSaveDataV3): NpcFriendProfile[] {
    const added = new Set(save.friendState.friendIds);
    return NPC_FRIENDS.filter((profile) => !added.has(profile.id));
  }

  static getFriendListEntries(save: RealmSaveDataV3, now = new Date()): FriendListEntry[] {
    FriendSystem.syncResets(save, now);
    const sent = new Set(save.friendState.sentGiftToday);
    const received = new Set(save.friendState.receivedGiftToday);

    return FriendSystem.getAddedFriends(save).map((profile) => ({
      profile,
      sentToday: sent.has(profile.id),
      receivedToday: received.has(profile.id),
      canSend: !sent.has(profile.id),
      canReceive: !received.has(profile.id),
    }));
  }

  static addFriend(save: RealmSaveDataV3, npcId: string): FriendActionResult {
    const profile = getNpcFriend(npcId);
    if (!profile) {
      return { success: false, reason: 'Friend not found' };
    }

    if (save.friendState.friendIds.includes(npcId)) {
      return { success: false, reason: 'Already on friend list' };
    }

    if (save.friendState.friendIds.length >= MAX_FRIENDS) {
      return { success: false, reason: `Friend list full (${MAX_FRIENDS} max)` };
    }

    save.friendState.friendIds = [...save.friendState.friendIds, npcId];
    return { success: true };
  }

  static removeFriend(save: RealmSaveDataV3, npcId: string): FriendActionResult {
    if (!save.friendState.friendIds.includes(npcId)) {
      return { success: false, reason: 'Not on friend list' };
    }

    save.friendState.friendIds = save.friendState.friendIds.filter((id) => id !== npcId);
    save.friendState.sentGiftToday = save.friendState.sentGiftToday.filter((id) => id !== npcId);
    save.friendState.receivedGiftToday = save.friendState.receivedGiftToday.filter((id) => id !== npcId);
    return { success: true };
  }

  static sendDailyGift(save: RealmSaveDataV3, friendId: string, now = new Date()): FriendActionResult {
    FriendSystem.syncResets(save, now);

    if (!save.friendState.friendIds.includes(friendId)) {
      return { success: false, reason: 'Add this friend first' };
    }

    if (save.friendState.sentGiftToday.includes(friendId)) {
      return { success: false, reason: 'Already sent gift today' };
    }

    save.friendState.sentGiftToday = [...save.friendState.sentGiftToday, friendId];
    GameEventBus.emit(save, { type: 'friend_gift_sent', friendId });
    return { success: true };
  }

  /**
   * Claim a daily return gift from one friend — 5 Energy + 1 Friendship Point.
   * Energy uses EconomySystem.grantCurrency (same path as Sweep refunds / RewardSystem bundles).
   */
  static receiveDailyGift(save: RealmSaveDataV3, friendId: string, now = new Date()): FriendGiftClaimSummary {
    FriendSystem.syncResets(save, now);

    if (!save.friendState.friendIds.includes(friendId)) {
      return {
        success: false,
        claimedCount: 0,
        energyGranted: 0,
        friendshipPointsGranted: 0,
        reason: 'Add this friend first',
      };
    }

    if (save.friendState.receivedGiftToday.includes(friendId)) {
      return {
        success: false,
        claimedCount: 0,
        energyGranted: 0,
        friendshipPointsGranted: 0,
        reason: 'Already claimed gift today',
      };
    }

    const energyBefore = EconomySystem.getCurrencyBalance(save, 'energy');
    EconomySystem.grantCurrency(save, 'energy', ENERGY_PER_GIFT, 'friend_gift');
    EconomySystem.grantCurrency(save, 'friendship_point', FRIENDSHIP_POINTS_PER_GIFT, 'friend_gift');
    const energyGranted = EconomySystem.getCurrencyBalance(save, 'energy') - energyBefore;

    save.friendState.receivedGiftToday = [...save.friendState.receivedGiftToday, friendId];
    syncFriendshipPointsMirror(save);

    return {
      success: true,
      claimedCount: 1,
      energyGranted,
      friendshipPointsGranted: FRIENDSHIP_POINTS_PER_GIFT,
    };
  }

  static claimAllReceivedGifts(save: RealmSaveDataV3, now = new Date()): FriendGiftClaimSummary {
    FriendSystem.syncResets(save, now);

    let claimedCount = 0;
    let energyGranted = 0;
    let friendshipPointsGranted = 0;

    for (const friendId of [...save.friendState.friendIds]) {
      if (save.friendState.receivedGiftToday.includes(friendId)) continue;

      const result = FriendSystem.receiveDailyGift(save, friendId, now);
      if (result.success) {
        claimedCount += result.claimedCount;
        energyGranted += result.energyGranted;
        friendshipPointsGranted += result.friendshipPointsGranted;
      }
    }

    if (claimedCount === 0) {
      return {
        success: false,
        claimedCount: 0,
        energyGranted: 0,
        friendshipPointsGranted: 0,
        reason: 'No gifts to claim',
      };
    }

    return {
      success: true,
      claimedCount,
      energyGranted,
      friendshipPointsGranted,
    };
  }

  static getPendingGiftCount(save: RealmSaveDataV3, now = new Date()): number {
    FriendSystem.syncResets(save, now);
    const received = new Set(save.friendState.receivedGiftToday);
    return save.friendState.friendIds.filter((id) => !received.has(id)).length;
  }
}

export function resetDailyGifts(save: RealmSaveDataV3, dateKey: string): void {
  FriendSystem.resetDailyGifts(save, dateKey);
}
