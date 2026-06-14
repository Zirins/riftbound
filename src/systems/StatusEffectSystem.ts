// src/systems/StatusEffectSystem.ts
// V2 runtime status effects — apply, tick, expire on battle units only.

import { BATTLE_STAT_CAPS } from '../constants/gameConfig';
import { getStatusEffectDefinition } from '../data/statusEffects';
import type {
  BattleState,
  BattleUnitRef,
  RuntimeStatusEffect,
  StatusEffectId,
} from '../types';
import {
  createStatusInstanceId,
  enemyRef,
  heroRef,
  isUnitAlive,
  markUnitDead,
  resolveDefenseDamage,
} from './battleStateUtils';

export interface ApplyStatusOptions {
  durationMs: number;
  value?: number;
  stacks?: number;
  sourceHeroId?: string;
}

export class StatusEffectSystem {
  static applyStatus(
    target: BattleUnitRef,
    statusId: StatusEffectId,
    options: ApplyStatusOptions,
  ): RuntimeStatusEffect | null {
    const definition = getStatusEffectDefinition(statusId);
    if (!definition) {
      console.warn('[StatusEffectSystem] unknown status', statusId);
      return null;
    }

    const value = options.value ?? 0;
    const requestedStacks = options.stacks ?? 1;
    const maxStacks = definition.maxStacks ?? 1;
    const existing = target.unit.v2StatusEffects.find((effect) => effect.statusId === statusId);

    if (existing) {
      existing.durationRemainingMs = Math.max(existing.durationRemainingMs, options.durationMs);
      existing.stacks = Math.min(maxStacks, existing.stacks + requestedStacks);
      if (value > 0) {
        existing.value = value;
      }
      if (options.sourceHeroId) {
        existing.sourceHeroId = options.sourceHeroId;
      }
      return existing;
    }

    const runtimeEffect: RuntimeStatusEffect = {
      id: createStatusInstanceId(),
      statusId,
      value,
      durationRemainingMs: options.durationMs,
      stacks: Math.min(maxStacks, requestedStacks),
      sourceHeroId: options.sourceHeroId,
    };
    target.unit.v2StatusEffects.push(runtimeEffect);
    return runtimeEffect;
  }

  static removeStatus(target: BattleUnitRef, statusId: StatusEffectId): void {
    target.unit.v2StatusEffects = target.unit.v2StatusEffects.filter(
      (effect) => effect.statusId !== statusId,
    );
  }

  static hasStatus(target: BattleUnitRef, statusId: StatusEffectId): boolean {
    return target.unit.v2StatusEffects.some(
      (effect) => effect.statusId === statusId && effect.durationRemainingMs > 0,
    );
  }

  static isStunned(target: BattleUnitRef): boolean {
    return this.hasStatus(target, 'stun');
  }

  static isSilenced(target: BattleUnitRef): boolean {
    return this.hasStatus(target, 'silence');
  }

  static getShieldRemaining(target: BattleUnitRef): number {
    const shield = target.unit.v2StatusEffects.find((effect) => effect.statusId === 'shielded');
    return shield?.value ?? 0;
  }

  static getDamageTakenMultiplier(target: BattleUnitRef): number {
    const vulnerable = this.getStatusStrength(target, 'vulnerable');
    return 1 + vulnerable;
  }

  static getDamageReduction(target: BattleUnitRef): number {
    const reduction = this.getStatusStrength(target, 'damage_reduction');
    return Math.min(BATTLE_STAT_CAPS.DAMAGE_REDUCTION, reduction);
  }

  static getHealingMultiplier(target: BattleUnitRef): number {
    const wound = this.getStatusStrength(target, 'wound');
    return Math.max(0, 1 - Math.min(BATTLE_STAT_CAPS.HEALING_REDUCTION, wound));
  }

  static update(deltaMs: number, battleState: BattleState): void {
    for (const hero of battleState.heroes) {
      this.tickUnit(heroRef(hero), deltaMs);
    }
    for (const enemy of battleState.enemies) {
      this.tickUnit(enemyRef(enemy), deltaMs);
    }
  }

  static applyDamageWithMitigation(
    target: BattleUnitRef,
    rawDamage: number,
    options?: { ignoreDefense?: boolean },
  ): number {
    if (!isUnitAlive(target)) return 0;

    let damage = rawDamage;
    if (!options?.ignoreDefense) {
      damage = resolveDefenseDamage(damage, target.unit.defense);
    }

    damage = Math.floor(damage * this.getDamageTakenMultiplier(target));
    const reduction = this.getDamageReduction(target);
    damage = Math.floor(damage * (1 - reduction));
    damage = Math.max(0, damage);

    const shieldRemaining = this.getShieldRemaining(target);
    if (shieldRemaining > 0 && damage > 0) {
      const absorbed = Math.min(shieldRemaining, damage);
      this.consumeShield(target, absorbed);
      damage -= absorbed;
    }

    if (damage <= 0) return 0;

    target.unit.currentHP -= damage;
    if (target.unit.currentHP <= 0) {
      markUnitDead(target);
    }
    return damage;
  }

  private static tickUnit(target: BattleUnitRef, deltaMs: number): void {
    if (!isUnitAlive(target) && target.unit.v2StatusEffects.length === 0) return;

    const surviving: RuntimeStatusEffect[] = [];
    for (const effect of target.unit.v2StatusEffects) {
      if (effect.statusId === 'burn' && effect.value > 0 && isUnitAlive(target)) {
        const burnDamage = Math.floor(effect.value * (deltaMs / 1000));
        if (burnDamage > 0) {
          this.applyDamageWithMitigation(target, burnDamage, { ignoreDefense: true });
        }
      }

      effect.durationRemainingMs -= deltaMs;
      if (effect.durationRemainingMs > 0) {
        surviving.push(effect);
      }
    }
    target.unit.v2StatusEffects = surviving;
  }

  private static consumeShield(target: BattleUnitRef, amount: number): void {
    const shield = target.unit.v2StatusEffects.find((effect) => effect.statusId === 'shielded');
    if (!shield) return;

    shield.value = Math.max(0, shield.value - amount);
    if (shield.value <= 0) {
      this.removeStatus(target, 'shielded');
    }
  }

  private static getStatusStrength(target: BattleUnitRef, statusId: StatusEffectId): number {
    return target.unit.v2StatusEffects
      .filter((effect) => effect.statusId === statusId && effect.durationRemainingMs > 0)
      .reduce((total, effect) => total + effect.value * effect.stacks, 0);
  }
}
