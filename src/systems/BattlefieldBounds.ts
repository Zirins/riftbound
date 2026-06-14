// src/systems/BattlefieldBounds.ts
// Keeps combat units inside the playable battlefield (above the bottom HUD strip).

import { CANVAS } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

export interface BattlefieldRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function getBattlefieldRect(radius: number): BattlefieldRect {
  return {
    minX: radius,
    maxX: CANVAS.WIDTH - radius,
    minY: radius,
    maxY: CANVAS.BATTLE_HEIGHT - radius,
  };
}

function clampCoord(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPosition(
  unit: { x: number; y: number; radius: number },
  bounds: BattlefieldRect,
): void {
  unit.x = clampCoord(unit.x, bounds.minX, bounds.maxX);
  unit.y = clampCoord(unit.y, bounds.minY, bounds.maxY);
}

export function clampHeroPosition(hero: HeroRuntimeState): void {
  clampPosition(hero, getBattlefieldRect(hero.radius));
}

export function clampEnemyPosition(enemy: EnemyRuntimeState): void {
  clampPosition(enemy, getBattlefieldRect(enemy.radius));
}

export function clampAllBattleUnits(
  heroes: HeroRuntimeState[],
  enemies: EnemyRuntimeState[],
): void {
  for (const hero of heroes) {
    if (hero.isAlive) clampHeroPosition(hero);
  }
  for (const enemy of enemies) {
    if (enemy.isAlive) clampEnemyPosition(enemy);
  }
}
