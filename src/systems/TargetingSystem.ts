// src/systems/TargetingSystem.ts
// Per-class target selection AI for heroes and enemies.
// V2: data-driven TargetRule resolution for SkillSystem.

import { MAGE, SUPPORT } from '../constants/gameConfig';
import type {
  AreaDefinition,
  BattleHero,
  BattleState,
  BattleUnitRef,
  EnemyRuntimeState,
  HeroRuntimeState,
  TargetRule,
} from '../types';
import {
  enemyRef,
  getDistance,
  getHpRatio,
  getLivingEnemies,
  getLivingHeroes,
  getUnitCurrentHp,
  heroRef,
  isUnitAlive,
} from './battleStateUtils';

type PositionedUnit = { x: number; y: number };

export function resolveTargets(
  rule: TargetRule,
  caster: BattleHero,
  battleState: BattleState,
  options?: { area?: AreaDefinition; maxTargets?: number },
): BattleUnitRef[] {
  const livingHeroes = getLivingHeroes(battleState);
  const livingEnemies = getLivingEnemies(battleState);
  let targets: BattleUnitRef[] = [];

  switch (rule) {
    case 'self':
      targets = isUnitAlive(heroRef(caster)) ? [heroRef(caster)] : [];
      break;
    case 'nearest_enemy':
      targets = pickEnemyRef(findNearest(caster, livingEnemies));
      break;
    case 'lowest_hp_enemy':
      targets = pickEnemyRef(findLowestHpEnemy(caster, livingEnemies));
      break;
    case 'highest_atk_enemy':
      targets = pickEnemyRef(findHighestAttackEnemy(livingEnemies));
      break;
    case 'backline_enemy':
      targets = pickEnemyRef(findBacklineEnemy(livingEnemies));
      break;
    case 'frontline_enemy':
      targets = pickEnemyRef(findFrontlineEnemy(livingEnemies));
      break;
    case 'densest_enemy_cluster':
      targets = pickEnemyRef(findDensestClusterEnemy(caster, livingEnemies));
      break;
    case 'random_enemy':
      targets = pickEnemyRef(pickRandomEnemy(livingEnemies));
      break;
    case 'lowest_hp_ally':
      targets = pickHeroRef(findLowestHpAlly(caster, livingHeroes));
      break;
    case 'all_allies':
      targets = livingHeroes.map((hero) => heroRef(hero));
      break;
    case 'all_enemies':
      targets = livingEnemies.map((enemy) => enemyRef(enemy));
      break;
    case 'area_forward_box':
    case 'area_circle':
      targets = resolveAreaAroundCaster(caster, livingEnemies, options?.area);
      break;
    default:
      targets = pickEnemyRef(findNearest(caster, livingEnemies));
      break;
  }

  if (options?.maxTargets !== undefined && options.maxTargets > 0) {
    return targets.slice(0, options.maxTargets);
  }
  return targets;
}

export function resolveAreaAroundCaster(
  caster: BattleHero,
  enemies: EnemyRuntimeState[],
  area?: AreaDefinition,
  maxTargets?: number,
): BattleUnitRef[] {
  const targets = filterEnemiesAroundPoint(caster, enemies, area);
  if (maxTargets !== undefined && maxTargets > 0) {
    return targets.slice(0, maxTargets);
  }
  return targets;
}

export function resolveAreaAroundPoint(
  center: PositionedUnit,
  enemies: EnemyRuntimeState[],
  area?: AreaDefinition,
  maxTargets?: number,
): BattleUnitRef[] {
  const targets = filterEnemiesAroundPoint(center, enemies, area);
  if (maxTargets !== undefined && maxTargets > 0) {
    return targets.slice(0, maxTargets);
  }
  return targets;
}

export function resolveMultiBacklineEnemies(
  battleState: BattleState,
  maxTargets: number,
): BattleUnitRef[] {
  return getLivingEnemies(battleState)
    .sort((enemyA, enemyB) => enemyB.x - enemyA.x)
    .slice(0, maxTargets)
    .map((enemy) => enemyRef(enemy));
}

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
    (ally) => heroHpRatio(ally) < SUPPORT.HEAL_TARGET_HP_THRESHOLD,
  );
  if (needsHeal.length === 0) return null;

  return needsHeal.reduce((lowest, ally) =>
    heroHpRatio(ally) < heroHpRatio(lowest) ? ally : lowest,
  );
}

export function getNearestLivingEnemy(
  hero: HeroRuntimeState,
  enemies: EnemyRuntimeState[],
): EnemyRuntimeState | null {
  const living = enemies.filter((enemy) => enemy.isAlive);
  return findNearest(hero, living);
}

function getDistanceBetween(a: PositionedUnit, b: PositionedUnit): number {
  return getDistance(a, b);
}

function pickEnemyRef(enemy: EnemyRuntimeState | null): BattleUnitRef[] {
  return enemy ? [enemyRef(enemy)] : [];
}

function pickHeroRef(hero: HeroRuntimeState | null): BattleUnitRef[] {
  return hero && hero.isAlive ? [heroRef(hero as BattleHero)] : [];
}

function findHighestAttackEnemy(enemies: EnemyRuntimeState[]): EnemyRuntimeState | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((best, enemy) => (enemy.attack > best.attack ? enemy : best));
}

function findFrontlineEnemy(enemies: EnemyRuntimeState[]): EnemyRuntimeState | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((best, enemy) => (enemy.x < best.x ? enemy : best));
}

function findBacklineEnemy(enemies: EnemyRuntimeState[]): EnemyRuntimeState | null {
  if (enemies.length === 0) return null;
  return enemies.reduce((best, enemy) => (enemy.x > best.x ? enemy : best));
}

function pickRandomEnemy(enemies: EnemyRuntimeState[]): EnemyRuntimeState | null {
  if (enemies.length === 0) return null;
  return enemies[Math.floor(Math.random() * enemies.length)];
}

function findLowestHpAlly(
  caster: BattleHero,
  heroes: BattleHero[],
): BattleHero | null {
  const allies = heroes.filter((hero) => hero.heroId !== caster.heroId);
  if (allies.length === 0) return null;

  return allies.reduce((lowest, ally) => {
    if (getUnitCurrentHp(heroRef(ally)) < getUnitCurrentHp(heroRef(lowest))) return ally;
    if (getUnitCurrentHp(heroRef(ally)) > getUnitCurrentHp(heroRef(lowest))) return lowest;
    return getHpRatio(heroRef(ally)) < getHpRatio(heroRef(lowest)) ? ally : lowest;
  });
}

function filterEnemiesAroundPoint(
  center: PositionedUnit,
  enemies: EnemyRuntimeState[],
  area?: AreaDefinition,
): BattleUnitRef[] {
  if (!area) return [];

  if (area.shape === 'circle') {
    const radius = area.radius ?? MAGE.CLUSTER_RADIUS;
    const origin = {
      x: center.x + (area.offsetX ?? 0),
      y: center.y + (area.offsetY ?? 0),
    };
    return enemies
      .filter((enemy) => enemy.isAlive && getDistanceBetween(origin, enemy) <= radius)
      .map((enemy) => enemyRef(enemy));
  }

  const width = area.width ?? 120;
  const height = area.height ?? 80;
  const originX = center.x + (area.offsetX ?? 0);
  const originY = center.y + (area.offsetY ?? 0);
  return enemies
    .filter((enemy) =>
      enemy.isAlive
      && enemy.x >= originX
      && enemy.x <= originX + width
      && enemy.y >= originY - height / 2
      && enemy.y <= originY + height / 2,
    )
    .map((enemy) => enemyRef(enemy));
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
    getDistanceBetween(source, candidate) < getDistanceBetween(source, nearest) ? candidate : nearest,
  );
}

function heroHpRatio(unit: HeroRuntimeState): number {
  return unit.currentHP / unit.maxHP;
}
