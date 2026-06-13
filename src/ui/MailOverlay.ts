// src/ui/MailOverlay.ts
// System mail inbox overlay launched from Hub.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { loadCurrentRealm } from '../systems/SaveSystem';
import * as MailSystem from '../systems/MailSystem';
import type { MailMessage } from '../types';

const PANEL_WIDTH = 620;
const PANEL_HEIGHT = 320;
const ROW_HEIGHT = 56;
const BUTTON_HEIGHT = 36;
const OVERLAY_DEPTH = 100;

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

function formatAttachments(mail: MailMessage): string {
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

export class MailOverlay {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private readonly rowTexts: Phaser.GameObjects.Text[] = [];
  private readonly onClose: () => void;
  private readonly onRefresh: () => void;

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

    const dim = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HEIGHT,
      0x000000,
      0.75,
    );

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

    this.addContainerButton(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + 140,
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
  ): void {
    if (!this.container) return;

    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, 0x3355aa);
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
    const realm = loadCurrentRealm();
    const mails = [...(realm?.mail ?? [])].sort((a, b) => b.sentAt - a.sentAt);
    const startY = CANVAS.HEIGHT / 2 - 95;

    if (mails.length === 0) {
      const empty = this.scene.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20, 'No messages.', {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(empty);
      this.container?.add(empty);
      return;
    }

    for (let i = 0; i < mails.length; i += 1) {
      const mail = mails[i];
      const y = startY + i * ROW_HEIGHT;
      const leftX = CANVAS.WIDTH / 2 - PANEL_WIDTH / 2 + 24;

      const subject = this.scene.add.text(leftX, y - 12, mail.subject, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(subject);

      const sender = this.scene.add.text(leftX, y + 6, `${mail.fromName} — ${formatAttachments(mail)}`, {
        fontSize: '9px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(sender);

      this.container?.add([subject, sender]);

      if (mail.attachments.length > 0 && !mail.isClaimed) {
        this.addContainerButton(
          CANVAS.WIDTH / 2 + 200,
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
        const claimed = this.scene.add.text(CANVAS.WIDTH / 2 + 200, y, '✓ CLAIMED', {
          fontSize: '10px',
          color: '#44ff88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.rowTexts.push(claimed);
        this.container?.add(claimed);
      }
    }
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private destroyContent(): void {
    this.overlayButtons.length = 0;

    this.container?.destroy(true);
    this.container = null;
    this.rowTexts.length = 0;
  }

  destroy(): void {
    this.destroyContent();
  }
}
