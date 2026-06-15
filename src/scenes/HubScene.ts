// src/scenes/HubScene.ts
// V1.1 central hub — navigation, currency bar, feature gates, overlays.

import Phaser from 'phaser';
import { getAccountTierLabel, CANVAS, UI } from '../constants/gameConfig';
import { HEROES_DATA } from '../data/heroes';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { SceneKey } from '../constants/sceneKeys';
import * as EnergySystem from '../systems/EnergySystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import {
  getUnlockMessage,
  isUnlocked,
  type FeatureKey,
} from '../systems/FeatureUnlockSystem';
import * as MailSystem from '../systems/MailSystem';
import { OfflineRewardSystem } from '../systems/OfflineRewardSystem';
import * as RiftChronicleSystem from '../systems/RiftChronicleSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import { computeRP } from '../systems/HeroProgressionSystem';
import * as TaskSystem from '../systems/TaskSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { CurrencyBar } from '../ui/CurrencyBar';
import { MailOverlay } from '../ui/MailOverlay';
import { OfflineRewardOverlay } from '../ui/OfflineRewardOverlay';
import { NotificationDot } from '../ui/NotificationDot';
import { RiftChronicleOverlay } from '../ui/RiftChronicleOverlay';
import { TasksOverlay } from '../ui/TasksOverlay';

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
  { label: 'VOID TRIAL', sublabel: 'Weekly tower', x: 422, y: 300, featureKey: 'VOID_TRIAL', sceneKey: SCENE_KEYS.VOID_TRIAL },
  { label: 'COVENANT', sublabel: 'Guild hall', x: 694, y: 300, featureKey: 'COVENANT', sceneKey: SCENE_KEYS.COVENANT_HUB },
];

export class HubScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HUB;

  private currencyBar: CurrencyBar | null = null;
  private activeOverlay: RiftChronicleOverlay | TasksOverlay | MailOverlay | OfflineRewardOverlay | null = null;
  private profileLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private zoneButtons: ButtonPrimary[] = [];
  private bottomButtons: ButtonPrimary[] = [];
  private mailDot: NotificationDot | null = null;
  private tasksDot: NotificationDot | null = null;
  private achievementsDot: NotificationDot | null = null;
  private chronicleDot: NotificationDot | null = null;
  private lockIcons: Phaser.GameObjects.Text[] = [];
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: HubScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.processHubLoadResets();
    TaskSystem.resetIfNewDay();
    RiftChronicleSystem.checkAndUpdate();

    this.buildTopBar();
    this.buildZones();
    this.buildBottomBar();
    this.refreshNotificationDots();
    this.currencyBar?.updateValues();

    if (this.shouldShowOfflineRewardOverlay()) {
      this.openOfflineRewardOverlay();
    }
  }

  shutdown(): void {
    this.touchLastOnline();
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.closeActiveOverlay();
    this.currencyBar?.destroy();
    this.profileLabel?.destroy();
    this.toastLabel?.destroy();
    this.mailDot?.destroy();
    this.tasksDot?.destroy();
    this.achievementsDot?.destroy();
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
    this.achievementsDot = null;
    this.chronicleDot = null;
  }

  private buildTopBar(): void {
    const realm = loadCurrentRealm();
    const avatarColor = AVATAR_COLORS[realm?.avatarColorIndex ?? 0] ?? AVATAR_COLORS[0];

    this.add.circle(28, 28, 14, avatarColor);

    const accountLevel = realm?.accountLevel ?? 1;
    const tierLabel = getAccountTierLabel(accountLevel);
    const rp = this.computeFormationRP();
    this.profileLabel = this.add.text(50, 28, [
      `${realm?.playerName ?? 'Relic Bearer'}  LV${accountLevel}  ${tierLabel}`,
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

    const tasksButton = new ButtonPrimary(this, 250, 340, '☑ TASKS', () => this.openTasksOverlay(), 110);
    this.tasksDot = new NotificationDot(this, 298, 322);

    const achievementsButton = new ButtonPrimary(
      this,
      380,
      340,
      '🏆 ACHIEV',
      () => this.onAchievementsTap(),
      110,
    );
    this.achievementsDot = new NotificationDot(this, 428, 322);

    const settingsButton = new ButtonPrimary(
      this,
      510,
      340,
      '⚙ SETTINGS',
      () => this.scene.start(SCENE_KEYS.SETTINGS),
      110,
    );

    const inventoryButton = new ButtonPrimary(
      this,
      640,
      340,
      '🎒 BAG',
      () => this.onInventoryTap(),
      90,
    );

    const quickBattle = new ButtonPrimary(
      this,
      750,
      340,
      '▶▶ QUICK',
      () => this.scene.start(SCENE_KEYS.FORMATION, { origin: 'quickBattle' }),
      120,
    );

    this.bottomButtons.push(mailButton, tasksButton, achievementsButton, settingsButton, inventoryButton, quickBattle);
  }

  private onAchievementsTap(): void {
    if (!isUnlocked('ACHIEVEMENTS')) {
      this.showToast(getUnlockMessage('ACHIEVEMENTS'));
      return;
    }

    this.scene.start(SCENE_KEYS.ACHIEVEMENTS);
  }

  private onInventoryTap(): void {
    if (!isUnlocked('INVENTORY')) {
      this.showToast(getUnlockMessage('INVENTORY'));
      return;
    }

    this.scene.start(SCENE_KEYS.INVENTORY);
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

  private openOfflineRewardOverlay(): void {
    this.closeActiveOverlay();
    this.activeOverlay = new OfflineRewardOverlay(
      this,
      () => this.handleOverlayClosed(),
      () => this.refreshHubState(),
    );
  }

  private processHubLoadResets(): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const offlineEligible = OfflineRewardSystem.preview(save).eligible;

    if (!offlineEligible) {
      EnergySystem.applyRegenToSave(save);
    }

    OfflineRewardSystem.syncOnHubLoad(save);
    AchievementSystem.syncSnapshotAchievements(save);
    saveCurrentRealm(save);
  }

  private shouldShowOfflineRewardOverlay(): boolean {
    const realm = loadCurrentRealm();
    if (!realm) return false;
    return OfflineRewardSystem.hasPendingRewards(realm as RealmSaveDataV3);
  }

  private touchLastOnline(): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    OfflineRewardSystem.touchLastOnline(save);
    saveCurrentRealm(save);
  }

  private openMailOverlay(): void {
    this.closeActiveOverlay();
    this.activeOverlay = new MailOverlay(
      this,
      () => this.handleOverlayClosed(),
      () => this.refreshHubState(),
    );
  }

  private openTasksOverlay(): void {
    this.closeActiveOverlay();
    this.activeOverlay = new TasksOverlay(
      this,
      () => this.handleOverlayClosed(),
      () => this.refreshHubState(),
    );
  }

  private openChronicleOverlay(): void {
    this.closeActiveOverlay();
    this.activeOverlay = new RiftChronicleOverlay(
      this,
      () => this.handleOverlayClosed(),
      () => this.refreshHubState(),
    );
  }

  private handleOverlayClosed(): void {
    this.activeOverlay = null;
    this.refreshHubState();
  }

  private closeActiveOverlay(): void {
    this.activeOverlay?.destroy();
    this.activeOverlay = null;
  }

  private refreshHubState(): void {
    this.refreshNotificationDots();
    this.currencyBar?.updateValues();
  }

  private refreshNotificationDots(): void {
    const mailCount = MailSystem.getUnclaimedCount();
    if (mailCount > 0) this.mailDot?.show(mailCount);
    else this.mailDot?.hide();

    const taskCount = TaskSystem.getTasksNotificationCount();
    if (taskCount > 0) this.tasksDot?.show(taskCount);
    else this.tasksDot?.hide();

    const realm = loadCurrentRealm();
    const achievementCount = realm
      ? AchievementSystem.getUnclaimedCount(realm as RealmSaveDataV3)
      : 0;
    if (achievementCount > 0) this.achievementsDot?.show(achievementCount);
    else this.achievementsDot?.hide();

    if (RiftChronicleSystem.isAvailableToday()) this.chronicleDot?.show();
    else this.chronicleDot?.hide();
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 90, message, {
      fontSize: '12px',
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

  private computeFormationRP(): number {
    const realm = loadCurrentRealm();
    if (!realm) return 0;

    let total = 0;
    for (const slot of realm.currentFormation.slots) {
      if (!slot.assignedHeroId) continue;
      const owned = realm.ownedHeroes.find((h) => h.heroId === slot.assignedHeroId);
      const heroData = HEROES_DATA.find((hero) => hero.id === slot.assignedHeroId);
      if (owned && heroData) total += computeRP(owned, heroData);
    }
    return total;
  }
}
