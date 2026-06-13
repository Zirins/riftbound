// src/scenes/SettingsScene.ts
// Audio settings, auto-ultimate default, clear data, and version info.

import Phaser from 'phaser';
import { APP, CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { loadCurrentRealm, loadRoot, saveCurrentRealm, saveRoot } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { ModalBase } from '../ui/ModalBase';
import { TouchSlider } from '../ui/TouchSlider';

const SLIDER_X = 260;
const SLIDER_WIDTH = 280;
const ROW_Y = {
  MUSIC: 120,
  SFX: 170,
  AUTO_ULT: 230,
} as const;

export class SettingsScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SETTINGS;

  private backButton: ButtonPrimary | null = null;
  private clearDataButton: ButtonPrimary | null = null;
  private musicSlider: TouchSlider | null = null;
  private sfxSlider: TouchSlider | null = null;
  private autoUltimateToggle: Phaser.GameObjects.Rectangle | null = null;
  private autoUltimateLabel: Phaser.GameObjects.Text | null = null;
  private autoUltimateZone: Phaser.GameObjects.Zone | null = null;
  private confirmModal: ModalBase | null = null;
  private versionLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: SettingsScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    const settings = realm?.settings ?? {
      musicVolume: 80,
      sfxVolume: 80,
      defaultAutoUltimate: false,
    };

    this.add.text(CANVAS.WIDTH / 2, 48, 'SETTINGS', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(80, ROW_Y.MUSIC, 'Music Volume', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.musicSlider = new TouchSlider(
      this,
      SLIDER_X,
      ROW_Y.MUSIC,
      SLIDER_WIDTH,
      settings.musicVolume,
      (value) => this.persistSettings({ musicVolume: value }),
    );

    this.add.text(80, ROW_Y.SFX, 'SFX Volume', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.sfxSlider = new TouchSlider(
      this,
      SLIDER_X,
      ROW_Y.SFX,
      SLIDER_WIDTH,
      settings.sfxVolume,
      (value) => this.persistSettings({ sfxVolume: value }),
    );

    this.add.text(80, ROW_Y.AUTO_ULT, 'Default Auto-Ultimate', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.buildAutoUltimateToggle(settings.defaultAutoUltimate);

    this.clearDataButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      290,
      'CLEAR DATA',
      () => this.openClearDataModal(),
      160,
    );

    this.versionLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 72, `Version ${APP.VERSION}`, {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.backButton = new ButtonPrimary(
      this,
      80,
      CANVAS.HEIGHT - 40,
      '← BACK',
      () => this.scene.start(SCENE_KEYS.HUB),
      120,
    );
  }

  shutdown(): void {
    this.confirmModal?.destroy();
    this.confirmModal = null;
    this.musicSlider?.destroy();
    this.sfxSlider?.destroy();
    this.musicSlider = null;
    this.sfxSlider = null;

    this.autoUltimateZone?.off('pointerup');
    this.autoUltimateZone?.destroy();
    this.autoUltimateToggle?.destroy();
    this.autoUltimateLabel?.destroy();
    this.autoUltimateZone = null;
    this.autoUltimateToggle = null;
    this.autoUltimateLabel = null;

    this.backButton?.destroy();
    this.clearDataButton?.destroy();
    this.versionLabel?.destroy();
    this.backButton = null;
    this.clearDataButton = null;
    this.versionLabel = null;
  }

  private buildAutoUltimateToggle(enabled: boolean): void {
    const x = SLIDER_X + 20;
    const y = ROW_Y.AUTO_ULT;

    this.autoUltimateToggle = this.add.rectangle(x, y, 44, 24, enabled ? 0x44aa66 : 0x444455);
    this.autoUltimateLabel = this.add.text(x + 58, y, enabled ? 'ON' : 'OFF', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.autoUltimateZone = this.add.zone(x + 22, y, 80, 28);
    this.autoUltimateZone.setInteractive({ useHandCursor: true });
    this.autoUltimateZone.on('pointerup', () => {
      const realm = loadCurrentRealm();
      const nextValue = !(realm?.settings.defaultAutoUltimate ?? false);
      this.persistSettings({ defaultAutoUltimate: nextValue });
      this.autoUltimateToggle?.setFillStyle(nextValue ? 0x44aa66 : 0x444455);
      this.autoUltimateLabel?.setText(nextValue ? 'ON' : 'OFF');
    });
  }

  private persistSettings(
    partial: Partial<{
      musicVolume: number;
      sfxVolume: number;
      defaultAutoUltimate: boolean;
    }>,
  ): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    saveCurrentRealm({
      ...realm,
      settings: {
        ...realm.settings,
        ...partial,
      },
    });
  }

  private openClearDataModal(): void {
    this.confirmModal?.destroy();
    this.confirmModal = new ModalBase(
      this,
      'Clear Data',
      'This will permanently delete your progress in this realm.',
      {
        confirmLabel: 'DELETE',
        cancelLabel: 'CANCEL',
        onCancel: () => {
          this.confirmModal?.destroy();
          this.confirmModal = null;
        },
        onConfirm: () => {
          this.confirmModal?.destroy();
          this.confirmModal = null;
          this.deleteCurrentRealm();
          this.scene.start(SCENE_KEYS.REALM_SELECT);
        },
      },
    );
  }

  private deleteCurrentRealm(): void {
    const root = loadRoot();
    const realmId = root?.selectedRealmId;
    if (!root || !realmId) return;

    delete root.realms[realmId];
    const remainingIds = Object.keys(root.realms);
    root.selectedRealmId = remainingIds.length > 0 ? remainingIds[0] : null;
    saveRoot(root);
  }
}
