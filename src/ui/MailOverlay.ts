// src/ui/MailOverlay.ts
// System mail inbox overlay launched from Hub.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { loadCurrentRealm } from '../systems/SaveSystem';
import * as MailSystem from '../systems/MailSystem';
import type { MailMessage } from '../types';
import { createOverlayDim } from './HubOverlayPanel';

const PANEL_WIDTH = 620;
const PANEL_HEIGHT = 320;
const ROW_HEIGHT = 56;
const BUTTON_HEIGHT = 36;
const OVERLAY_DEPTH = 100;
const LIST_TOP_Y = CANVAS.HEIGHT / 2 - 100;
const LIST_VIEW_HEIGHT = 200;
const FOOTER_Y = CANVAS.HEIGHT / 2 + 140;

const CURRENCY_LABELS: Record<string, string> = {
  gold: 'Gold',
  rift_crystal: 'Rift Crystals',
  void_gem: 'Void Gems',
  energy: 'Energy',
  arena_coin: 'Arena Coins',
  covenant_coin: 'Sect Coins',
  friendship_point: 'Friendship Points',
};

const ITEM_LABELS: Record<string, string> = {
  xp_fragment: 'XP Fragments',
  sigil_dust: 'Sigil Dust',
  awakening_crystal: 'Awakening Crystal',
};

function formatRewardBundleSummary(bundle: NonNullable<MailMessage['rewardBundle']>): string {
  const parts: string[] = [];

  for (const currency of bundle.currencies ?? []) {
    const label = CURRENCY_LABELS[currency.type] ?? currency.type;
    parts.push(`${currency.amount} ${label}`);
  }

  for (const item of bundle.items ?? []) {
    const label = ITEM_LABELS[item.itemId] ?? item.itemId;
    parts.push(`${label} x${item.quantity}`);
  }

  return parts.join(', ');
}

function formatAttachments(mail: MailMessage): string {
  if (mail.rewardBundle) {
    return formatRewardBundleSummary(mail.rewardBundle);
  }

  if (mail.attachments.length === 0) return 'No attachments';
  return mail.attachments.map((attachment) => {
    switch (attachment.type) {
      case 'gold':
        return `${attachment.amount} Gold`;
      case 'crystals':
        return `${attachment.amount} Crystals`;
      case 'xpFragments':
        return `${attachment.amount} XP Fragments`;
      case 'energy':
        return `${attachment.amount} Energy`;
      case 'shards':
        return `${attachment.amount} Shards`;
      default:
        return attachment.type;
    }
  }).join(', ');
}

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class MailOverlay {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private mailListContainer: Phaser.GameObjects.Container | null = null;
  private mailListMask: Phaser.GameObjects.Rectangle | null = null;
  private mailScrollOffset = 0;
  private mailMaxScrollY = 0;
  private readonly onClose: () => void;
  private readonly onRefresh: () => void;
  private readonly onMailWheel = (
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (!this.mailListContainer || this.mailMaxScrollY <= 0) return;
    this.mailScrollOffset = Phaser.Math.Clamp(this.mailScrollOffset + deltaY * 0.6, 0, this.mailMaxScrollY);
    this.mailListContainer.setY(LIST_TOP_Y - this.mailScrollOffset);
  };

  constructor(scene: Phaser.Scene, onClose: () => void, onRefresh: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.onRefresh = onRefresh;
    this.render();
  }

  private render(): void {
    this.destroyContent();

    this.container = this.scene.add.container(0, 0).setDepth(OVERLAY_DEPTH);
    this.container.setSize(CANVAS.WIDTH, CANVAS.HEIGHT);

    const dim = createOverlayDim(this.scene);

    const panel = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      0x1a1a2e,
    );
    panel.setStrokeStyle(2, 0x44ccff);

    const title = this.scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 140, 'MAIL', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.container.add([dim, panel, title]);
    this.drawMail();

    const claimableCount = MailSystem.getUnclaimedCount();
    this.addContainerButton(
      CANVAS.WIDTH / 2 - 80,
      FOOTER_Y,
      claimableCount > 0 ? 'CLAIM ALL' : 'NO CLAIMS',
      () => {
        if (MailSystem.claimAllAttachments() <= 0) return;
        this.onRefresh();
        this.render();
      },
      140,
      claimableCount > 0 ? 0x3355aa : 0x444455,
    );

    this.addContainerButton(
      CANVAS.WIDTH / 2 + 120,
      FOOTER_Y,
      'CLOSE',
      () => this.close(),
      100,
    );
  }

  private addContainerButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 80,
    fillColor = 0x3355aa,
  ): void {
    if (!this.container) return;

    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, fillColor);
    const text = this.scene.add.text(x, y, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, width, BUTTON_HEIGHT);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    this.container.add([bg, text, zone]);
    this.overlayButtons.push({ bg, label: text, zone });
  }

  private drawMail(): void {
    this.teardownMailScroll();

    const realm = loadCurrentRealm();
    const mails = [...(realm?.mail ?? [])].sort((a, b) => b.sentAt - a.sentAt);
    const leftX = CANVAS.WIDTH / 2 - PANEL_WIDTH / 2 + 24;
    const claimX = CANVAS.WIDTH / 2 + 200;

    const listContainer = this.scene.add.container(0, LIST_TOP_Y);
    this.mailListContainer = listContainer;
    this.container?.add(listContainer);

    if (mails.length === 0) {
      const empty = this.scene.add.text(
        CANVAS.WIDTH / 2,
        LIST_VIEW_HEIGHT / 2,
        'No messages.',
        {
          fontSize: '12px',
          color: '#aaaacc',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5);
      listContainer.add(empty);
    } else {
      for (let i = 0; i < mails.length; i += 1) {
        const mail = mails[i];
        const y = i * ROW_HEIGHT;

        const subject = this.scene.add.text(leftX, y - 12, mail.subject, {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5);

        const sender = this.scene.add.text(leftX, y + 6, `${mail.fromName} — ${formatAttachments(mail)}`, {
          fontSize: '9px',
          color: '#aaaacc',
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5);

        listContainer.add([subject, sender]);

        const claimLocalX = claimX;
        if ((mail.attachments.length > 0 || mail.rewardBundle) && !mail.isClaimed) {
          this.addListButton(
            listContainer,
            claimLocalX,
            y,
            'CLAIM',
            () => {
              MailSystem.claimAttachments(mail.id);
              this.onRefresh();
              this.render();
            },
            100,
          );
        } else if (mail.isClaimed) {
          const claimed = this.scene.add.text(claimLocalX, y, '✓ CLAIMED', {
            fontSize: '10px',
            color: '#44ff88',
            fontFamily: 'monospace',
          }).setOrigin(0.5);
          listContainer.add(claimed);
        }
      }
    }

    this.mailListMask = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      LIST_TOP_Y + LIST_VIEW_HEIGHT / 2,
      PANEL_WIDTH - 24,
      LIST_VIEW_HEIGHT,
      0x000000,
      0,
    );
    listContainer.setMask(this.mailListMask.createGeometryMask());
    this.container?.add(this.mailListMask);

    const totalHeight = Math.max(ROW_HEIGHT, mails.length * ROW_HEIGHT);
    this.mailMaxScrollY = Math.max(0, totalHeight - LIST_VIEW_HEIGHT);
    this.mailScrollOffset = 0;
    listContainer.setY(LIST_TOP_Y);

    if (this.mailMaxScrollY > 0) {
      this.scene.input.on('wheel', this.onMailWheel);
    }
  }

  private addListButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width: number,
  ): void {
    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, 0x3355aa);
    const text = this.scene.add.text(x, y, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, width, BUTTON_HEIGHT);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    parent.add([bg, text, zone]);
    this.overlayButtons.push({ bg, label: text, zone });
  }

  private teardownMailScroll(): void {
    this.scene.input.off('wheel', this.onMailWheel);
    this.mailListContainer?.destroy(true);
    this.mailListContainer = null;
    this.mailListMask?.destroy();
    this.mailListMask = null;
    this.mailScrollOffset = 0;
    this.mailMaxScrollY = 0;
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private destroyContent(): void {
    this.teardownMailScroll();

    for (const button of this.overlayButtons) button.zone.off('pointerup');
    this.overlayButtons.length = 0;

    this.container?.destroy(true);
    this.container = null;
  }

  destroy(): void {
    this.destroyContent();
  }
}
