// src/systems/battleStateUtils.ts
// Shared helpers for V2 runtime battle units — no save access.

import { COMBAT } from '../constants/gameConfig';
import type {
  BattleEnemy,
  BattleHero,
  BattleState,
  BattleUnitRef,
  BattleUnitSide,
  EnemyRuntimeState,
  HeroRuntimeState,
} from '../types';

let nextStatusInstanceId = 0;

export function createStatusInstanceId(): string {
  nextStatusInstanceId += 1;
  return `v2_status_${nextStatusInstanceId}`;
}

export function resetStatusInstanceIdsForTests(): void {
  nextStatusInstanceId = 0;
}

export function heroRef(hero: BattleHero): BattleUnitRef {
  return { side: 'hero', unit: hero };
}

export function enemyRef(enemy: BattleEnemy | EnemyRuntimeState): BattleUnitRef {
  const battleEnemy: BattleEnemy = 'v2StatusEffects' in enemy
    ? (enemy as BattleEnemy)
    : { ...enemy, v2StatusEffects: [] };
  return { side: 'enemy', unit: battleEnemy };
}

export function getUnitId(ref: BattleUnitRef): string {
  return ref.side === 'hero' ? ref.unit.heroId : ref.unit.instanceId;
}

export function isUnitAlive(ref: BattleUnitRef): boolean {
  return ref.unit.isAlive;
}

export function getUnitPosition(ref: BattleUnitRef): { x: number; y: number } {
  return { x: ref.unit.x, y: ref.unit.y };
}

export function getUnitAttack(ref: BattleUnitRef): number {
  return ref.unit.attack;
}

export function getUnitDefense(ref: BattleUnitRef): number {
  return ref.unit.defense;
}

export function getUnitCurrentHp(ref: BattleUnitRef): number {
  return ref.unit.currentHP;
}

export function getUnitMaxHp(ref: BattleUnitRef): number {
  return ref.unit.maxHP;
}

export function getLivingHeroes(state: BattleState): BattleHero[] {
  return state.heroes.filter((hero) => hero.isAlive);
}

export function getLivingEnemies(state: BattleState): BattleEnemy[] {
  return state.enemies.filter((enemy) => enemy.isAlive);
}

export function findHeroById(state: BattleState, heroId: string): BattleHero | undefined {
  return state.heroes.find((hero) => hero.heroId === heroId);
}

export function findEnemyByInstanceId(state: BattleState, instanceId: string): BattleEnemy | undefined {
  return state.enemies.find((enemy) => enemy.instanceId === instanceId);
}

export function findUnitRef(
  state: BattleState,
  unitId: string,
  side: BattleUnitSide,
): BattleUnitRef | null {
  if (side === 'hero') {
    const hero = findHeroById(state, unitId);
    return hero ? heroRef(hero) : null;
  }
  const enemy = findEnemyByInstanceId(state, unitId);
  return enemy ? enemyRef(enemy) : null;
}

export function getDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getHpRatio(ref: BattleUnitRef): number {
  return ref.unit.currentHP / ref.unit.maxHP;
}

export function resolveDefenseDamage(rawDamage: number, defense: number): number {
  return Math.max(COMBAT.MIN_DAMAGE, Math.floor(rawDamage - defense));
}

export function scaleStatValue(
  caster: BattleHero,
  stat: NonNullable<import('../types').SkillEffect['scaling']>['stat'],
  multiplier: number,
): number {
  switch (stat) {
    case 'atk':
      return Math.floor(caster.attack * multiplier);
    case 'maxHp':
      return Math.floor(caster.maxHP * multiplier);
    case 'def':
      return Math.floor(caster.defense * multiplier);
    case 'currentHpMissing':
      return Math.floor((caster.maxHP - caster.currentHP) * multiplier);
    default:
      return 0;
  }
}

export function markUnitDead(ref: BattleUnitRef): void {
  ref.unit.currentHP = 0;
  ref.unit.isAlive = false;
}

export function clampHeroEnergy(hero: HeroRuntimeState): void {
  hero.currentEnergy = Math.min(COMBAT.ENERGY_MAX, Math.max(0, hero.currentEnergy));
}

export function ensureBattleHero(hero: HeroRuntimeState): BattleHero {
  const battleHero = hero as BattleHero;
  if (!battleHero.v2StatusEffects) {
    battleHero.v2StatusEffects = [];
  }
  return battleHero;
}

export function ensureBattleEnemy(enemy: EnemyRuntimeState): BattleEnemy {
  return 'v2StatusEffects' in enemy
    ? (enemy as BattleEnemy)
    : { ...enemy, v2StatusEffects: [] };
}

export function buildBattleState(
  heroes: HeroRuntimeState[],
  enemies: EnemyRuntimeState[],
  elapsedTimeMs: number,
): BattleState {
  return {
    heroes: heroes.map((hero) => ensureBattleHero(hero)),
    enemies: enemies.map((enemy) => ensureBattleEnemy(enemy)),
    elapsedTimeMs,
  };
}

export function snapshotDeadEnemyIds(enemies: EnemyRuntimeState[]): Set<string> {
  const dead = new Set<string>();
  for (const enemy of enemies) {
    if (!enemy.isAlive) dead.add(enemy.instanceId);
  }
  return dead;
}

export function emitNewlyDeadEnemies(
  emitter: { emit: (event: string, instanceId: string) => void },
  previouslyDead: Set<string>,
  enemies: EnemyRuntimeState[],
): void {
  for (const enemy of enemies) {
    if (!enemy.isAlive && !previouslyDead.has(enemy.instanceId)) {
      previouslyDead.add(enemy.instanceId);
      emitter.emit('enemyKilled', enemy.instanceId);
    }
  }
}
