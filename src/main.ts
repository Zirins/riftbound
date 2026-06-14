// src/main.ts
// Entry point — creates the Phaser.Game instance.
//
// Capacitor Android shell loads this bundle from dist/ via capacitor.config.ts.
// Optional @capacitor/app pause/resume listeners can be added post-MVP.

import Phaser from 'phaser';
import { gameConfig } from './game';

if (import.meta.env.DEV) {
  void import('./dev/phase7CombatHarness').then((module) => {
    module.exposePhase7CombatHarness();
  });
  void import('./dev/phase9AwakeningHarness').then((module) => {
    module.exposePhase9AwakeningHarness();
  });
  void import('./dev/phase10SigilHarness').then((module) => {
    module.exposePhase10SigilHarness();
  });
  void import('./dev/phase12BondHarness').then((module) => {
    module.exposePhase12BondHarness();
  });
}

new Phaser.Game(gameConfig);
