// src/ui/EnergyBar.ts
// Energy bar drawn above battle heroes.

import Phaser from 'phaser';
import { COMBAT, UI } from '../constants/gameConfig';
import type { HeroRuntimeState } from '../types';

export function drawEnergyBar(
  graphics: Phaser.GameObjects.Graphics,
  hero: HeroRuntimeState,
): void {
  const energyRatio = hero.currentEnergy / COMBAT.ENERGY_MAX;
  const barX = hero.x - UI.HP_BAR_WIDTH / 2;
  const barY = hero.y + UI.ENERGY_BAR_Y_OFFSET;

  graphics.fillStyle(UI.HP_BAR_BG_COLOR, 1);
  graphics.fillRect(barX, barY, UI.HP_BAR_WIDTH, UI.ENERGY_BAR_HEIGHT);
  graphics.fillStyle(UI.ENERGY_BAR_COLOR, 1);
  graphics.fillRect(barX, barY, UI.HP_BAR_WIDTH * energyRatio, UI.ENERGY_BAR_HEIGHT);
}
