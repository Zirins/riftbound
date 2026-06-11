// src/main.ts
// Entry point — creates the Phaser.Game instance.
//
// Capacitor app-lifecycle listeners (pause/resume on background) are wired
// in Prompt 10 when @capacitor/app is installed and the Android build is set up.

import Phaser from 'phaser';
import { gameConfig } from './game';

new Phaser.Game(gameConfig);
