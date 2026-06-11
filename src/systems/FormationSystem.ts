// src/systems/FormationSystem.ts
// Formation positions and walk-in animation before combat starts.

import Phaser from 'phaser';
import { CANVAS, FORMATION } from '../constants/gameConfig';
import type { EnemyRuntimeState, HeroClass, HeroLineupEntry, HeroRuntimeState } from '../types';

interface WalkInUnit {
  runtime: HeroRuntimeState | EnemyRuntimeState;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export function getStartPosition(slotIndex: number): { x: number; y: number } {
  const position = FORMATION.HERO_POSITIONS[slotIndex];
  return { x: position.x, y: position.y };
}

export function getEnemyStartPosition(slotIndex: number): { x: number; y: number } {
  const position = FORMATION.ENEMY_POSITIONS[slotIndex];
  return { x: position.x, y: position.y };
}

/** Battle position for a formation slot — reads FORMATION.HERO_POSITIONS directly. */
export function getHeroBattlePosition(slotIndex: number): { x: number; y: number } {
  return getStartPosition(slotIndex);
}

function getCombatClassAssignPriority(heroClass: HeroClass): number {
  const assignOrder = FORMATION.COMBAT_CLASS_ASSIGN_ORDER as readonly HeroClass[];
  const priorityIndex = assignOrder.indexOf(heroClass);
  return priorityIndex === -1 ? assignOrder.length : priorityIndex;
}

function isFrontlineClass(heroClass: HeroClass): boolean {
  return (FORMATION.COMBAT_FRONTLINE_CLASSES as readonly HeroClass[]).includes(heroClass);
}

/** Maps each selected hero to a combat slot by class/role — independent of lineup display order. */
export function assignCombatSlotIndices(
  lineup: readonly HeroLineupEntry[],
): Map<string, number> {
  const assignments = new Map<string, number>();
  const frontSlots = [...FORMATION.COMBAT_FRONT_SLOT_INDICES];
  const backSlots = [...FORMATION.COMBAT_BACK_SLOT_INDICES];
  let nextFrontSlot = 0;
  let nextBackSlot = 0;

  const sortedLineup = [...lineup].sort(
    (heroA, heroB) => getCombatClassAssignPriority(heroA.heroClass)
      - getCombatClassAssignPriority(heroB.heroClass),
  );

  for (const hero of sortedLineup) {
    const prefersFrontline = isFrontlineClass(hero.heroClass);

    if (prefersFrontline && nextFrontSlot < frontSlots.length) {
      assignments.set(hero.heroId, frontSlots[nextFrontSlot]);
      nextFrontSlot += 1;
      continue;
    }

    if (!prefersFrontline && nextBackSlot < backSlots.length) {
      assignments.set(hero.heroId, backSlots[nextBackSlot]);
      nextBackSlot += 1;
      continue;
    }

    if (nextFrontSlot < frontSlots.length) {
      assignments.set(hero.heroId, frontSlots[nextFrontSlot]);
      nextFrontSlot += 1;
      continue;
    }

    if (nextBackSlot < backSlots.length) {
      assignments.set(hero.heroId, backSlots[nextBackSlot]);
      nextBackSlot += 1;
    }
  }

  return assignments;
}

export class FormationSystem extends Phaser.Events.EventEmitter {
  private walkInUnits: WalkInUnit[] = [];
  private elapsedMs = 0;
  private isWalkingIn = false;

  get isActive(): boolean {
    return this.isWalkingIn;
  }

  animateEnemyWalkIn(enemies: EnemyRuntimeState[]): void {
    this.walkInUnits = [];
    this.elapsedMs = 0;
    this.isWalkingIn = true;

    const enemySpawnX = CANVAS.WIDTH + FORMATION.ENEMY_WALK_IN_SPAWN_OFFSET;
    enemies.forEach((enemy) => {
      const targetX = enemy.x;
      const targetY = enemy.y;

      enemy.x = enemySpawnX;
      enemy.y = targetY;

      this.walkInUnits.push({
        runtime: enemy,
        startX: enemySpawnX,
        startY: targetY,
        targetX,
        targetY,
      });
    });
  }

  animateWalkIn(
    heroes: HeroRuntimeState[],
    enemies: EnemyRuntimeState[],
  ): void {
    this.walkInUnits = [];
    this.elapsedMs = 0;
    this.isWalkingIn = true;

    heroes.forEach((hero) => {
      const targetX = hero.targetX;
      const targetY = hero.targetY;
      hero.x = FORMATION.HERO_WALK_IN_SPAWN_X;
      hero.y = targetY;

      this.walkInUnits.push({
        runtime: hero,
        startX: FORMATION.HERO_WALK_IN_SPAWN_X,
        startY: targetY,
        targetX,
        targetY,
      });
    });

    const enemySpawnX = CANVAS.WIDTH + FORMATION.ENEMY_WALK_IN_SPAWN_OFFSET;
    enemies.forEach((enemy, slotIndex) => {
      const target = getEnemyStartPosition(slotIndex);
      enemy.x = enemySpawnX;
      enemy.y = target.y;

      this.walkInUnits.push({
        runtime: enemy,
        startX: enemySpawnX,
        startY: target.y,
        targetX: target.x,
        targetY: target.y,
      });
    });
  }

  update(deltaSeconds: number): void {
    if (!this.isWalkingIn) return;

    this.elapsedMs += deltaSeconds * 1000;
    const progress = Math.min(this.elapsedMs / FORMATION.WALK_IN_DURATION, 1);

    for (const unit of this.walkInUnits) {
      const runtime = unit.runtime;
      runtime.x = unit.startX + (unit.targetX - unit.startX) * progress;
      runtime.y = unit.startY + (unit.targetY - unit.startY) * progress;

      if ('targetX' in runtime) {
        runtime.targetX = unit.targetX;
        runtime.targetY = unit.targetY;
      }
    }

    if (progress >= 1 || this.allUnitsArrived()) {
      this.snapToTargets();
      const enemyOnlyWalkIn = this.walkInUnits.every(
        (unit) => !('heroId' in unit.runtime),
      );
      this.isWalkingIn = false;
      this.walkInUnits = [];
      this.emit(enemyOnlyWalkIn ? 'waveEnemiesReady' : 'formationReady');
    }
  }

  private allUnitsArrived(): boolean {
    const threshold = FORMATION.ARRIVAL_THRESHOLD;
    return this.walkInUnits.every((unit) => {
      const dx = unit.runtime.x - unit.targetX;
      const dy = unit.runtime.y - unit.targetY;
      return dx * dx + dy * dy <= threshold * threshold;
    });
  }

  private snapToTargets(): void {
    for (const unit of this.walkInUnits) {
      unit.runtime.x = unit.targetX;
      unit.runtime.y = unit.targetY;
      if ('targetX' in unit.runtime) {
        unit.runtime.targetX = unit.targetX;
        unit.runtime.targetY = unit.targetY;
      }
    }
  }
}
