// src/systems/TargetingSystem.ts
// Per-class target selection AI for heroes and enemies.

import { MAGE, SUPPORT } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroRuntimeState } from '../types';

type PositionedUnit = { x: number; y: number };

export function getHeroTarget(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  const living = enemies.filter((enemy) => enemy.isAlive);
  if (living.length === 0) return null;

  switch (hero.heroClass) {
    case 'tank':
    case 'ranger':
      return findNearest(hero, living);
    case 'fighter':
      return findLowestHpEnemy(hero, living);
    case 'mage':
      return findDensestClusterEnemy(hero, living);
    case 'assassin':
      return findHighestXEnemy(living);
    case 'support':
      return null;
    default:
      return findNearest(hero, living);
  }
}

export function getEnemyTarget(
  enemy: EnemyRuntimeState,
  heroes: HeroRuntimeState[],
): HeroRuntimeState | null {
  const living = heroes.filter((hero) => hero.isAlive);
  if (living.length === 0) return null;

  const tauntTarget = living.find((hero) =>
    hero.activeBuffs.some((buff) => buff.type === 'taunt' && buff.durationRemaining > 0),
  );
  if (tauntTarget) return tauntTarget;

  return findNearest(enemy, living);
}

export function getSupportHealTarget(
  healer: HeroRuntimeState,
  heroes: HeroRuntimeState[],
): HeroRuntimeState | null {
  const allies = heroes.filter(
    (hero) => hero.isAlive && hero.heroId !== healer.heroId,
  );
  if (allies.length === 0) return null;

  const needsHeal = allies.filter(
    (ally) => getHpRatio(ally) < SUPPORT.HEAL_TARGET_HP_THRESHOLD,
  );
  if (needsHeal.length === 0) return null;

  return needsHeal.reduce((lowest, ally) =>
    getHpRatio(ally) < getHpRatio(lowest) ? ally : lowest,
  );
}

export function getNearestLivingEnemy(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  const living = enemies.filter((enemy) => enemy.isAlive);
  return findNearest(hero, living);
}

function findLowestHpEnemy(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((best, enemy) => {
    if (enemy.currentHP < best.currentHP) return enemy;
    if (enemy.currentHP > best.currentHP) return best;
    return getDistance(hero, enemy) < getDistance(hero, best) ? enemy : best;
  });
}

export function findLowestHpLivingEnemy(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  const living = enemies.filter((enemy) => enemy.isAlive);
  return findLowestHpEnemy(hero, living);
}

function findDensestClusterEnemy(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  return enemies.reduce((best, enemy) => {
    const bestCount = countAlliesWithinRadius(best, enemies, MAGE.CLUSTER_RADIUS);
    const enemyCount = countAlliesWithinRadius(enemy, enemies, MAGE.CLUSTER_RADIUS);
    if (enemyCount > bestCount) return enemy;
    if (enemyCount < bestCount) return best;
    return getDistance(hero, enemy) < getDistance(hero, best) ? enemy : best;
  });
}

function findHighestXEnemy(enemies: EnemyRuntimeState[]): EnemyRuntimeState | null {
  return enemies.reduce((best, enemy) => (enemy.x > best.x ? enemy : best));
}

function countAlliesWithinRadius(
  center: EnemyRuntimeState,
  enemies: EnemyRuntimeState[],
  radius: number,
): number {
  const radiusSq = radius * radius;
  return enemies.filter((enemy) => {
    if (!enemy.isAlive || enemy.instanceId === center.instanceId) return false;
    const dx = center.x - enemy.x;
    const dy = center.y - enemy.y;
    return dx * dx + dy * dy <= radiusSq;
  }).length;
}

function findNearest<T extends PositionedUnit>(
  source: PositionedUnit,
  candidates: T[],
): T | null {
  if (candidates.length === 0) return null;

  return candidates.reduce((nearest, candidate) =>
    getDistance(source, candidate) < getDistance(source, nearest) ? candidate : nearest,
  );
}

function getHpRatio(unit: HeroRuntimeState): number {
  return unit.currentHP / unit.maxHP;
}

function getDistance(a: PositionedUnit, b: PositionedUnit): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
