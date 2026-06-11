// src/game.ts
// Exports the Phaser.Types.Core.GameConfig for Riftbound Sigils.
// main.ts imports this and creates the Phaser.Game instance.

import Phaser from 'phaser';
import { CANVAS, UI } from './constants/gameConfig';
import { MainMenuScene } from './scenes/MainMenuScene';
import { FormationScene } from './scenes/FormationScene';
import { BattleScene } from './scenes/BattleScene';
import { VictoryScene } from './scenes/VictoryScene';
import { DefeatScene } from './scenes/DefeatScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
  backgroundColor: `#${UI.BACKGROUND_COLOR.toString(16).padStart(6, '0')}`,
  parent: 'game-container',
  scene: [
    MainMenuScene,
    FormationScene,
    BattleScene,
    VictoryScene,
    DefeatScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS.WIDTH,
    height: CANVAS.HEIGHT,
    // Landscape is enforced by the 844×390 dimensions — no orientation override needed.
  },
  render: {
    antialias: false,  // pixel-perfect on mobile; enable later if art requires it
    pixelArt: false,
  },
  input: {
    activePointers: 4,  // multi-touch for simultaneous ultimate taps
  },
};
