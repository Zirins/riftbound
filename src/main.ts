// src/main.ts
// Entry point — creates the Phaser.Game instance.
//
// Capacitor Android shell loads this bundle from dist/ via capacitor.config.ts.
// Optional @capacitor/app pause/resume listeners can be added post-MVP.

import Phaser from 'phaser';
import { gameConfig } from './game';

new Phaser.Game(gameConfig);
