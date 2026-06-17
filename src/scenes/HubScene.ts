// src/scenes/HubScene.ts
// Scrollable world-map hub with landmark hotspots and fixed HUD.

import Phaser from 'phaser';
import { ASSET_PATHS } from '../constants/assetPaths';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import * as EnergySystem from '../systems/EnergySystem';
import { AchievementSystem } from '../systems/AchievementSystem';
import { OfflineRewardSystem } from '../systems/OfflineRewardSystem';
import * as RiftChronicleSystem from '../systems/RiftChronicleSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import * as TaskSystem from '../systems/TaskSystem';
import type { RealmSaveDataV3 } from '../types';
import { HubHUD } from '../ui/HubHUD';
import { HubHotspot, type HubHotspotConfig } from '../ui/HubHotspot';
import { MailOverlay } from '../ui/MailOverlay';
import { OfflineRewardOverlay } from '../ui/OfflineRewardOverlay';
import { TasksOverlay } from '../ui/TasksOverlay';

const HUB_WORLD_WIDTH = 1560;
const HUB_WORLD_HEIGHT = 390;
const BG_TEXTURE_KEY = 'bg_hub';

const HUB_LANDMARKS: HubHotspotConfig[] = [
  { label: 'Campaign Gate', worldX: 200, featureKey: 'CAMPAIGN', sceneKey: SCENE_KEYS.CAMPAIGN },
  { label: 'Celestial Market', worldX: 380, featureKey: 'CELESTIAL_MARKET', sceneKey: SCENE_KEYS.SHOP },
  { label: 'Summon Temple', worldX: 660, featureKey: 'SUMMON_TEMPLE', sceneKey: SCENE_KEYS.SUMMON_TEMPLE },
  { label: 'Arena Pavilion', worldX: 950, featureKey: 'RESONANCE_ARENA', sceneKey: SCENE_KEYS.RESONANCE_ARENA },
  { label: 'Covenant Hall', worldX: 1200, featureKey: 'COVENANT', sceneKey: SCENE_KEYS.COVENANT_HUB },
  { label: 'Void Trial', worldX: 1430, featureKey: 'VOID_TRIAL', sceneKey: SCENE_KEYS.VOID_TRIAL },
];

export class HubScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HUB;

  private hubBgImage: Phaser.GameObjects.Image | null = null;
  private readonly hotspots: HubHotspot[] = [];
  private hubHud: HubHUD | null = null;
  private activeOverlay: MailOverlay | TasksOverlay | OfflineRewardOverlay | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  private dragPointerId: number | null = null;
  private dragStartPointerX = 0;
  private dragStartScrollX = 0;

  private readonly onPointerDown = (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
  ): void => {
    if (currentlyOver.length > 0) return;
    this.dragPointerId = pointer.id;
    this.dragStartPointerX = pointer.x;
    this.dragStartScrollX = this.cameras.main.scrollX;
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.dragPointerId || !pointer.isDown) return;
    const deltaX = pointer.x - this.dragStartPointerX;
    this.cameras.main.scrollX = this.dragStartScrollX - deltaX;
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.dragPointerId) return;
    this.dragPointerId = null;
  };

  private readonly onSceneResume = (): void => {
    this.refreshHubState();
  };

  constructor() {
    super({ key: HubScene.KEY });
  }

  preload(): void {
    this.load.image(BG_TEXTURE_KEY, ASSET_PATHS.backgrounds.hub);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    this.cameras.main.setBounds(0, 0, HUB_WORLD_WIDTH, HUB_WORLD_HEIGHT);
    this.cameras.main.setScroll(0, 0);

    this.processHubLoadResets();
    TaskSystem.resetIfNewDay();
    RiftChronicleSystem.checkAndUpdate();

    this.buildWorldLayer();
    this.setupCameraDrag();
    this.buildHud();

    this.events.on(Phaser.Scenes.Events.RESUME, this.onSceneResume);

    this.refreshHubState();

    if (this.shouldShowOfflineRewardOverlay()) {
      this.openOfflineRewardOverlay();
    }
  }

  shutdown(): void {
    this.events.off(Phaser.Scenes.Events.RESUME, this.onSceneResume);
    this.teardownCameraDrag();

    this.touchLastOnline();
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    this.closeActiveOverlay();

    for (const hotspot of this.hotspots) hotspot.destroy();
    this.hotspots.length = 0;

    this.hubHud?.destroy();
    this.hubHud = null;

    this.hubBgImage?.destroy();
    this.hubBgImage = null;
  }

  private buildWorldLayer(): void {
    const worldCenterY = HUB_WORLD_HEIGHT / 2;

    this.hubBgImage = this.add.image(HUB_WORLD_WIDTH / 2, worldCenterY, BG_TEXTURE_KEY)
      .setDisplaySize(HUB_WORLD_WIDTH, HUB_WORLD_HEIGHT)
      .setDepth(0);

    for (const landmark of HUB_LANDMARKS) {
      const hotspot = new HubHotspot(
        this,
        landmark,
        worldCenterY,
        (sceneKey) => this.scene.start(sceneKey),
        (message) => this.showToast(message),
      );
      hotspot.setDepth(2);
      this.hotspots.push(hotspot);
    }
  }

  private buildHud(): void {
    this.hubHud = new HubHUD(this, {
      onMail: () => this.openMailOverlay(),
      onFriends: () => this.scene.start(SCENE_KEYS.FRIENDS),
      onAchievements: () => this.scene.start(SCENE_KEYS.ACHIEVEMENTS),
      onHeroes: () => this.scene.start(SCENE_KEYS.ROSTER),
      onBag: () => this.scene.start(SCENE_KEYS.INVENTORY),
      onTasks: () => this.openTasksOverlay(),
      onSettings: () => this.scene.start(SCENE_KEYS.SETTINGS),
      onPass: () => this.scene.start(SCENE_KEYS.RIFT_SEASON),
      onQuickBattle: () => this.scene.start(SCENE_KEYS.FORMATION, { origin: 'quickBattle' }),
      showToast: (message) => this.showToast(message),
    });
  }

  private setupCameraDrag(): void {
    this.input.on('pointerdown', this.onPointerDown);
    this.input.on('pointermove', this.onPointerMove);
    this.input.on('pointerup', this.onPointerUp);
  }

  private teardownCameraDrag(): void {
    this.input.off('pointerdown', this.onPointerDown);
    this.input.off('pointermove', this.onPointerMove);
    this.input.off('pointerup', this.onPointerUp);
    this.dragPointerId = null;
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

  private openOfflineRewardOverlay(): void {
    this.closeActiveOverlay();
    this.activeOverlay = new OfflineRewardOverlay(
      this,
      () => this.handleOverlayClosed(),
      () => this.refreshHubState(),
    );
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

  private handleOverlayClosed(): void {
    this.activeOverlay = null;
    this.refreshHubState();
  }

  private closeActiveOverlay(): void {
    this.activeOverlay?.destroy();
    this.activeOverlay = null;
  }

  private refreshHubState(): void {
    this.hubHud?.refresh();
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
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    this.toastTimer = this.time.delayedCall(UI.TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
