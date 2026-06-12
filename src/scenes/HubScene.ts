// src/scenes/HubScene.ts
// V1.1 central hub — navigation, currency bar, feature gates, overlays.

import Phaser from 'phaser';
import { DAILY_TASKS } from '../data/tasks';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { SceneKey } from '../constants/sceneKeys';
import * as EnergySystem from '../systems/EnergySystem';
import {
  getUnlockMessage,
  isUnlocked,
  type FeatureKey,
} from '../systems/FeatureUnlockSystem';
import * as MailSystem from '../systems/MailSystem';
import * as RiftChronicleSystem from '../systems/RiftChronicleSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import * as TaskSystem from '../systems/TaskSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { CurrencyBar } from '../ui/CurrencyBar';
import { HubOverlayPanel } from '../ui/HubOverlayPanel';
import { NotificationDot } from '../ui/NotificationDot';

const AVATAR_COLORS = [0x4488ff, 0xff4422, 0x44cc66, 0xffcc22, 0x9944cc, 0xffffff];
const ZONE_WIDTH = 200;
const ZONE_HEIGHT = 64;

interface HubZoneConfig {
  label: string;
  sublabel: string;
  x: number;
  y: number;
  featureKey: FeatureKey;
  sceneKey?: SceneKey;
  overlay?: 'chronicle';
}

const HUB_ZONES: HubZoneConfig[] = [
  { label: 'CAMPAIGN', sublabel: 'Rift Outskirts', x: 150, y: 150, featureKey: 'CAMPAIGN', sceneKey: SCENE_KEYS.CAMPAIGN },
  { label: 'SUMMON TEMPLE', sublabel: 'Eternal Rift', x: 422, y: 150, featureKey: 'SUMMON_TEMPLE', sceneKey: SCENE_KEYS.SUMMON_TEMPLE },
  { label: 'RESONANCE ARENA', sublabel: 'Season Ranking', x: 694, y: 150, featureKey: 'RESONANCE_ARENA', sceneKey: SCENE_KEYS.RESONANCE_ARENA },
  { label: 'HEROES', sublabel: 'Manage squad', x: 150, y: 240, featureKey: 'HEROES_ROSTER', sceneKey: SCENE_KEYS.ROSTER },
  { label: 'CELESTIAL MARKET', sublabel: 'Exchange goods', x: 422, y: 240, featureKey: 'CELESTIAL_MARKET', sceneKey: SCENE_KEYS.SHOP },
  { label: 'RIFT CHRONICLE', sublabel: 'Daily rewards', x: 694, y: 240, featureKey: 'RIFT_CHRONICLE', overlay: 'chronicle' },
];

export class HubScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HUB;

  private currencyBar: CurrencyBar | null = null;
  private overlayPanel: HubOverlayPanel | null = null;
  private profileLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private zoneButtons: ButtonPrimary[] = [];
  private bottomButtons: ButtonPrimary[] = [];
  private mailDot: NotificationDot | null = null;
  private tasksDot: NotificationDot | null = null;
  private chronicleDot: NotificationDot | null = null;
  private lockIcons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: HubScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    this.overlayPanel = new HubOverlayPanel(this);

    EnergySystem.computeRegen();
    TaskSystem.resetIfNewDay();
    RiftChronicleSystem.checkAndUpdate();

    this.buildTopBar();
    this.buildZones();
    this.buildBottomBar();
    this.refreshNotificationDots();
  }

  shutdown(): void {
    this.overlayPanel?.destroy();
    this.overlayPanel = null;
    this.currencyBar?.destroy();
    this.profileLabel?.destroy();
    this.toastLabel?.destroy();
    this.mailDot?.destroy();
    this.tasksDot?.destroy();
    this.chronicleDot?.destroy();

    for (const icon of this.lockIcons) icon.destroy();
    this.lockIcons.length = 0;

    for (const button of this.zoneButtons) button.destroy();
    this.zoneButtons.length = 0;

    for (const button of this.bottomButtons) button.destroy();
    this.bottomButtons.length = 0;

    this.currencyBar = null;
    this.profileLabel = null;
    this.toastLabel = null;
    this.mailDot = null;
    this.tasksDot = null;
    this.chronicleDot = null;
  }

  private buildTopBar(): void {
    const realm = loadCurrentRealm();
    const avatarColor = AVATAR_COLORS[realm?.avatarColorIndex ?? 0] ?? AVATAR_COLORS[0];

    this.add.circle(28, 28, 14, avatarColor);

    const rp = this.computeFormationRP();
    this.profileLabel = this.add.text(50, 28, [
      `${realm?.playerName ?? 'Relic Bearer'}  LV${realm?.accountLevel ?? 1}`,
      `RP: ${rp.toLocaleString()}`,
    ].join('  '), {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.currencyBar = new CurrencyBar(this, 480, 28);
  }

  private buildZones(): void {
    for (const zone of HUB_ZONES) {
      const button = new ButtonPrimary(
        this,
        zone.x,
        zone.y,
        zone.label,
        () => this.onZoneTap(zone),
        ZONE_WIDTH,
        ZONE_HEIGHT,
      );

      this.add.text(zone.x, zone.y + 22, zone.sublabel, {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (!isUnlocked(zone.featureKey)) {
        const lock = this.add.text(zone.x + ZONE_WIDTH / 2 - 20, zone.y - 20, '🔒', {
          fontSize: '14px',
          color: '#ffcc44',
        }).setOrigin(0.5);
        this.lockIcons.push(lock);
      }

      if (zone.overlay === 'chronicle') {
        this.chronicleDot = new NotificationDot(
          this,
          zone.x + ZONE_WIDTH / 2 - 12,
          zone.y - ZONE_HEIGHT / 2 + 8,
        );
      }

      this.zoneButtons.push(button);
    }
  }

  private buildBottomBar(): void {
    const mailButton = new ButtonPrimary(this, 120, 340, '📬 MAIL', () => this.openMailOverlay(), 120);
    this.mailDot = new NotificationDot(this, 168, 322);

    const tasksButton = new ButtonPrimary(this, 280, 340, '☑ TASKS', () => this.openTasksOverlay(), 120);
    this.tasksDot = new NotificationDot(this, 328, 322);

    const settingsButton = new ButtonPrimary(
      this,
      440,
      340,
      '⚙ SETTINGS',
      () => this.scene.start(SCENE_KEYS.SETTINGS),
      120,
    );

    const quickBattle = new ButtonPrimary(
      this,
      700,
      340,
      '▶▶ QUICK BATTLE',
      () => this.scene.start(SCENE_KEYS.FORMATION, { origin: 'quickBattle' }),
      180,
    );

    this.bottomButtons.push(mailButton, tasksButton, settingsButton, quickBattle);
  }

  private onZoneTap(zone: HubZoneConfig): void {
    if (!isUnlocked(zone.featureKey)) {
      this.showToast(getUnlockMessage(zone.featureKey));
      return;
    }

    if (zone.overlay === 'chronicle') {
      this.openChronicleOverlay();
      return;
    }

    if (zone.sceneKey) {
      this.scene.start(zone.sceneKey);
    }
  }

  private openMailOverlay(): void {
    const realm = loadCurrentRealm();
    const panel = this.overlayPanel;
    if (!realm || !panel) return;

    panel.open('MAIL', () => panel.close());

    let y = CANVAS.HEIGHT / 2 - 40;
    if (realm.mail.length === 0) {
      panel.addText(CANVAS.WIDTH / 2, y, 'No messages.');
    } else {
      for (const mail of realm.mail) {
        const status = mail.isClaimed ? 'Claimed' : 'Unclaimed';
        panel.addText(CANVAS.WIDTH / 2, y, `${mail.subject} — ${status}`);
        y += 22;
      }
    }

    panel.addButton(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 70, 'CLAIM ALL', () => {
      for (const mail of realm.mail) {
        if (!mail.isClaimed && mail.attachments.length > 0) {
          MailSystem.claimAttachments(mail.id);
        }
      }
      panel.close();
      this.scene.restart();
    }, 140);
  }

  private openTasksOverlay(): void {
    const panel = this.overlayPanel;
    if (!panel) return;

    panel.open('DAILY TASKS', () => panel.close());

    let y = CANVAS.HEIGHT / 2 - 70;
    for (const taskState of TaskSystem.getDailyTasks()) {
      const def = DAILY_TASKS.find((d) => d.id === taskState.taskId);
      if (!def) continue;

      const progress = `${taskState.currentProgress}/${def.requiredProgress}`;
      panel.addText(CANVAS.WIDTH / 2, y, `${def.description} (${progress})`);
      y += 24;
    }
  }

  private openChronicleOverlay(): void {
    const panel = this.overlayPanel;
    if (!panel) return;

    const available = RiftChronicleSystem.isAvailableToday();
    const reward = RiftChronicleSystem.getTodayReward();

    panel.open('RIFT CHRONICLE', () => panel.close());

    const status = available ? 'Today\'s reward is ready!' : 'Already claimed today.';
    panel.addText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20, status);

    if (reward) {
      const summary = reward.rewards.map((r) => `${r.type} x${r.amount}`).join(', ');
      panel.addText(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 4, summary, '#88ff88');
    }

    if (available) {
      panel.addButton(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 50, 'CLAIM', () => {
        RiftChronicleSystem.claimToday();
        panel.close();
        this.scene.restart();
      }, 120);
    }
  }

  private refreshNotificationDots(): void {
    const mailCount = MailSystem.getUnclaimedCount();
    if (mailCount > 0) this.mailDot?.show(mailCount);
    else this.mailDot?.hide();

    const taskCount = TaskSystem.getTasksNotificationCount();
    if (taskCount > 0) this.tasksDot?.show(taskCount);
    else this.tasksDot?.hide();

    if (RiftChronicleSystem.isAvailableToday()) this.chronicleDot?.show();
    else this.chronicleDot?.hide();
  }

  private showToast(message: string): void {
    this.toastLabel?.destroy();
    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 90, message, {
      fontSize: '12px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.time.delayedCall(2500, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
    });
  }

  private computeFormationRP(): number {
    const realm = loadCurrentRealm();
    if (!realm) return 0;

    let total = 0;
    for (const slot of realm.currentFormation.slots) {
      if (!slot.assignedHeroId) continue;
      const owned = realm.ownedHeroes.find((h) => h.heroId === slot.assignedHeroId);
      if (owned) total += owned.level * 30 + owned.starRank * 150;
    }
    return total;
  }
}
