// src/scenes/BattleScene.ts
// V0.1: Complete auto-battle engine — hero circles, enemy circles, combat loop,
// HUD, ultimate buttons, wave system, victory/defeat transitions.
// Core systems are implemented in Prompts 2–8. This is the stub scaffold only.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';

export class BattleScene extends Phaser.Scene {
  static readonly KEY = 'BattleScene';

  private label!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: BattleScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.label = this.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      'BATTLE — stub\n(Prompts 2–8)',
      {
        fontSize: '18px',
        color: '#ff8844',
        fontFamily: 'monospace',
        align: 'center',
      },
    ).setOrigin(0.5);
  }

  shutdown(): void {
    this.label?.destroy();
  }
}
