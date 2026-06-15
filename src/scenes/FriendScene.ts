// src/scenes/FriendScene.ts
// Friends — NPC list, daily gifts, Friend Shop (Section 28).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { FriendShopSystem } from '../systems/FriendShopSystem';
import { FriendSystem } from '../systems/FriendSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import type { NpcFriendProfile } from '../data/npcFriends';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const FRIEND_ROW_HEIGHT = 26;
const SHOP_ROW_HEIGHT = 34;

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
    this.renderAddSection(save);
    this.renderShop(save);
  }

  private renderFriendList(save: RealmSaveDataV3): void {
    const title = this.add.text(40, 76, 'MY FRIENDS', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    });
    this.rowTexts.push(title);

    const entries = FriendSystem.getFriendListEntries(save);
    if (entries.length === 0) {
      const empty = this.add.text(CANVAS.WIDTH / 2, 100, 'No friends yet — add from the pool below.', {
        fontSize: '9px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(empty);
      return;
    }

    const maxVisible = 5;
    const visible = entries.slice(0, maxVisible);

    visible.forEach((entry, index) => {
      const y = 96 + index * FRIEND_ROW_HEIGHT;
      this.renderFriendRow(entry.profile, entry.canSend, entry.canReceive, entry.sentToday, entry.receivedToday, y);
    });

    if (entries.length > maxVisible) {
      const more = this.add.text(40, 96 + maxVisible * FRIEND_ROW_HEIGHT, `+${entries.length - maxVisible} more friends`, {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
      });
      this.rowTexts.push(more);
    }
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
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.rowTexts.push(name);

    const sendButton = new ButtonPrimary(
      this,
      280,
      y,
      sentToday ? 'SENT' : 'SEND',
      () => this.handleSend(profile.id),
      56,
      22,
    );
    sendButton.setEnabled(canSend);
    this.actionButtons.push(sendButton);

    const claimButton = new ButtonPrimary(
      this,
      350,
      y,
      receivedToday ? 'DONE' : 'CLAIM',
      () => this.handleReceive(profile.id),
      60,
      22,
    );
    claimButton.setEnabled(canReceive);
    this.actionButtons.push(claimButton);

    const removeButton = new ButtonPrimary(
      this,
      430,
      y,
      'RM',
      () => this.handleRemove(profile.id),
      40,
      22,
    );
    this.actionButtons.push(removeButton);
  }

  private renderAddSection(save: RealmSaveDataV3): void {
    const title = this.add.text(40, 188, 'ADD FRIENDS', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    });
    this.rowTexts.push(title);

    const available = FriendSystem.getAvailableToAdd(save).slice(0, 4);
    if (available.length === 0) {
      const full = this.add.text(CANVAS.WIDTH / 2, 210, 'All NPC friends added or list full.', {
        fontSize: '9px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(full);
      return;
    }

    available.forEach((profile, index) => {
      const y = 208 + index * 22;
      const label = this.add.text(40, y, profile.name, {
        fontSize: '9px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(label);

      const addButton = new ButtonPrimary(
        this,
        200,
        y,
        'ADD',
        () => this.handleAdd(profile.id),
        52,
        20,
      );
      this.actionButtons.push(addButton);
    });
  }

  private renderShop(save: RealmSaveDataV3): void {
    const title = this.add.text(40, 288, 'FRIEND SHOP', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    });
    this.rowTexts.push(title);

    const views = FriendShopSystem.getShopViews(save);
    views.forEach((view, index) => {
      const y = 306 + index * SHOP_ROW_HEIGHT;
      const leftX = 40;

      const name = this.add.text(leftX, y - 8, view.name, {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(name);

      const detail = this.add.text(
        leftX,
        y + 8,
        `${view.cost} FP  ·  ${view.remaining}/${view.weeklyLimit} left`,
        {
          fontSize: '9px',
          color: '#aaaacc',
          fontFamily: 'monospace',
        },
      ).setOrigin(0, 0.5);
      this.rowTexts.push(detail);

      const buyButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 80,
        y,
        'BUY',
        () => this.handlePurchase(view.id),
        64,
        24,
      );
      buyButton.setEnabled(view.canPurchase);
      this.actionButtons.push(buyButton);
    });
  }

  private handleAdd(npcId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendSystem.addFriend(save, npcId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Could not add friend');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
  }

  private handleRemove(npcId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendSystem.removeFriend(save, npcId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Could not remove friend');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
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

  private handlePurchase(itemId: string): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = FriendShopSystem.purchaseItem(save, itemId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Purchase failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
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
