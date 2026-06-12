// src/scenes/HubScene.ts
// V1.1 central hub — Phase 4 will expand this stub.

import Phaser from 'phaser';
import { CANVAS, STARTER, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { loadCurrentRealm } from '../systems/SaveSystem';

export class HubScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HUB;

  private infoLabel!: Phaser.GameObjects.Text;
  private quickBattleButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: HubScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    const playerName = realm?.playerName ?? 'Relic Bearer';
    const gold = realm?.inventory.gold ?? STARTER.GOLD;
    const crystals = realm?.inventory.riftCrystals ?? STARTER.RIFT_CRYSTALS;
    const energy = realm?.inventory.energy ?? STARTER.ENERGY;
    const maxEnergy = realm?.inventory.maxEnergy ?? 150;

    this.add.text(CANVAS.WIDTH / 2, 48, 'RIFT CITY — HUB', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.infoLabel = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 20,
      [
        `Welcome, ${playerName}`,
        `Gold: ${gold}   Crystals: ${crystals}   Energy: ${energy}/${maxEnergy}`,
        '',
        'HubScene stub — Phase 4 builds full navigation.',
      ].join('\n'),
      {
        fontSize: '14px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        align: 'center',
      },
    ).setOrigin(0.5);

    this.quickBattleButton = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 60, '[ QUICK BATTLE ]', {
      fontSize: '18px',
      color: '#44ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.quickBattleButton.on('pointerup', this.onQuickBattle, this);
  }

  shutdown(): void {
    this.quickBattleButton?.off('pointerup', this.onQuickBattle, this);
    this.quickBattleButton?.destroy();
    this.infoLabel?.destroy();
  }

  private readonly onQuickBattle = (): void => {
    this.scene.start(SCENE_KEYS.FORMATION);
  };
}
