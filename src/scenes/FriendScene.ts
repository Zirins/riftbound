// src/scenes/FriendScene.ts
// Friends — NPC list and daily gifts.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { FriendSystem } from '../systems/FriendSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import type { NpcFriendProfile } from '../data/npcFriends';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const FRIEND_ROW_HEIGHT = 36;
const LIST_START_Y = 78;

export class FriendScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.FRIENDS;

  private backButton: ButtonPrimary | null = null;
  private actionButtons: ButtonPrimary[] = [];
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: FriendScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    FriendSystem.syncResets(save);
    saveCurrentRealm(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'FRIENDS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const fp = FriendSystem.getFriendshipPoints(save);
    const energy = EconomySystem.getCurrencyBalance(save, 'energy');
    const header = this.add.text(
      CANVAS.WIDTH / 2,
      54,
      `Friendship Points: ${fp}  ·  Energy: ${energy}`,
      {
        fontSize: '10px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.rowTexts.push(header);

    const pending = FriendSystem.getPendingGiftCount(save);
    if (pending > 0) {
      const claimAll = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 100,
        54,
        'CLAIM ALL',
        () => this.handleClaimAll(),
        100,
        24,
      );
      this.actionButtons.push(claimAll);
    }

    this.renderFriendList(save);
  }

  private renderFriendList(save: RealmSaveDataV3): void {
    const title = this.add.text(40, LIST_START_Y - 18, 'MY FRIENDS', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    });
    this.rowTexts.push(title);

    const entries = FriendSystem.getFriendListEntries(save);
    if (entries.length === 0) {
      const empty = this.add.text(CANVAS.WIDTH / 2, LIST_START_Y + 20, 'No friends yet.', {
        fontSize: '10px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const y = LIST_START_Y + index * FRIEND_ROW_HEIGHT;
      this.renderFriendRow(entry.profile, entry.canSend, entry.canReceive, entry.sentToday, entry.receivedToday, y);
    });
  }

  private renderFriendRow(
    profile: NpcFriendProfile,
    canSend: boolean,
    canReceive: boolean,
    sentToday: boolean,
    receivedToday: boolean,
    y: number,
  ): void {
    const name = this.add.text(40, y, profile.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.rowTexts.push(name);

    const sendButton = new ButtonPrimary(
      this,
      300,
      y,
      sentToday ? 'SENT' : 'SEND',
      () => this.handleSend(profile.id),
      64,
      24,
    );
    sendButton.setEnabled(canSend);
    this.actionButtons.push(sendButton);

    const claimButton = new ButtonPrimary(
      this,
      390,
      y,
      receivedToday ? 'DONE' : 'CLAIM',
      () => this.handleReceive(profile.id),
      68,
      24,
    );
    claimButton.setEnabled(canReceive);
    this.actionButtons.push(claimButton);
  }

  private handleSend(friendId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendSystem.sendDailyGift(save, friendId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Could not send gift');
      return;
    }

    saveCurrentRealm(save);
    this.showToast('Gift sent!');
    this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
  }

  private handleReceive(friendId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendSystem.receiveDailyGift(save, friendId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Could not claim gift');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`+${result.energyGranted} Energy, +${result.friendshipPointsGranted} FP`);
    this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
  }

  private handleClaimAll(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendSystem.claimAllReceivedGifts(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'No gifts to claim');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`+${result.energyGranted} Energy, +${result.friendshipPointsGranted} FP`);
    this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 40, message, {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.backButton?.destroy();
    this.backButton = null;

    for (const button of this.actionButtons) button.destroy();
    this.actionButtons.length = 0;

    for (const text of this.rowTexts) text.destroy();
    this.rowTexts.length = 0;
  }
}
