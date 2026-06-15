// src/systems/SkillSystem.ts
// V2 data-driven skill execution — reads HeroCombatKit, resolves targets, applies effects.

import { COMBAT, HERO_NEW } from '../constants/gameConfig';
import { getHeroCombatKit } from '../data/heroKits';
import { AwakeningModifierSystem } from './AwakeningModifierSystem';
import { getStatusEffectDefinition, isKnownStatusEffect } from '../data/statusEffects';
import type {
  BattleEvent,
  BattleHero,
  BattleState,
  BattleUnitRef,
  HeroSkill,
  RealmSaveDataV3,
  RuntimeHeroKit,
  SkillCastResult,
  SkillEffect,
  SkillEffectResult,
  SkillTrigger,
  StatusEffectId,
  TargetRule,
} from '../types';
import {
  clampHeroEnergy,
  getUnitId,
  heroRef,
  enemyRef,
  isUnitAlive,
  scaleStatValue,
} from './battleStateUtils';
import {
  resolveAreaAroundCaster,
  resolveAreaAroundPoint,
  resolveMultiBacklineEnemies,
  resolveTargets,
  isEnemyIsolated,
} from './TargetingSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { SummonUnitSystem } from './SummonUnitSystem';
import { clampHeroPosition } from './BattlefieldBounds';

const PASSIVE_EVENT_TRIGGERS: Partial<Record<BattleEvent['type'], SkillTrigger>> = {
  combat_start: 'combat_start',
  on_hit: 'on_hit',
  on_crit: 'on_crit',
  on_kill: 'on_kill',
  on_death: 'on_death',
  on_revive: 'on_revive',
  on_ally_low_hp: 'on_ally_low_hp',
  on_status_applied: 'on_status_applied',
};

export class SkillSystem {
  static initializeHeroRuntimeKit(
    hero: BattleHero,
    save: RealmSaveDataV3,
  ): RuntimeHeroKit {
    const kit = getHeroCombatKit(hero.heroId);
    if (!kit) {
      throw new Error(`[SkillSystem] missing HeroCombatKit for hero: ${hero.heroId}`);
    }

    const awakeningLevel = save.awakeningState[hero.heroId]?.awakeningLevel ?? 0;
    const runtimeKit = AwakeningModifierSystem.buildRuntimeHeroKit(kit, awakeningLevel);

    hero.runtimeKit = runtimeKit;
    hero.v2StatusEffects = hero.v2StatusEffects ?? [];
    return runtimeKit;
  }

  static updateCooldownSkills(
    hero: BattleHero,
    battleState: BattleState,
    deltaMs: number,
  ): SkillCastResult[] {
    if (!hero.isAlive || !hero.runtimeKit) return [];

    for (const cooldown of hero.runtimeKit.cooldowns) {
      cooldown.remainingMs = Math.max(0, cooldown.remainingMs - deltaMs);
    }

    if (StatusEffectSystem.isStunned(heroRef(hero)) || StatusEffectSystem.isSilenced(heroRef(hero))) {
      return [];
    }

    const results: SkillCastResult[] = [];
    for (const skillId of hero.runtimeKit.kit.aiProfile.sideSkillPriority) {
      const skill = this.findSkill(hero, skillId);
      if (!skill || skill.trigger !== 'cooldown') continue;

      const cooldown = hero.runtimeKit.cooldowns.find((entry) => entry.skillId === skillId);
      if (!cooldown || cooldown.remainingMs > 0) continue;

      const castResult = this.castSkill(hero, skillId, battleState);
      if (castResult.success) {
        results.push(castResult);
        break;
      }
    }

    return results;
  }

  static evaluatePassiveEvent(
    hero: BattleHero,
    battleState: BattleState,
    event: BattleEvent,
  ): SkillCastResult[] {
    if (!hero.isAlive || !hero.runtimeKit) return [];

    const passive = hero.runtimeKit.kit.passive;
    const mappedTrigger = PASSIVE_EVENT_TRIGGERS[event.type];
    if (!mappedTrigger || passive.trigger !== mappedTrigger) {
      return [];
    }

    if (event.sourceHeroId && event.sourceHeroId !== hero.heroId) {
      if (mappedTrigger !== 'on_ally_low_hp' && mappedTrigger !== 'on_status_applied') {
        return [];
      }
    }

    const castResult = this.castSkill(hero, passive.id, battleState);
    return castResult.success ? [castResult] : [];
  }

  static castSkill(
    hero: BattleHero,
    skillId: string,
    battleState: BattleState,
  ): SkillCastResult {
    const failure = (reason: string): SkillCastResult => ({
      success: false,
      skillId,
      casterHeroId: hero.heroId,
      reason,
      targets: [],
      effects: [],
    });

    if (!hero.isAlive || !hero.runtimeKit) {
      return failure('caster_dead_or_uninitialized');
    }

    const skill = this.findSkill(hero, skillId);
    if (!skill) {
      return failure('skill_not_found');
    }

    if (
      (skill.type === 'ultimate' || skill.type === 'side')
      && StatusEffectSystem.isSilenced(heroRef(hero))
    ) {
      return failure('silenced');
    }

    if (StatusEffectSystem.isStunned(heroRef(hero)) && skill.type !== 'passive') {
      return failure('stunned');
    }

    if (skill.energyCost !== undefined && hero.currentEnergy < skill.energyCost) {
      return failure('insufficient_energy');
    }

    if (skill.trigger === 'cooldown') {
      const cooldown = hero.runtimeKit.cooldowns.find((entry) => entry.skillId === skillId);
      if (cooldown && cooldown.remainingMs > 0) {
        return failure('on_cooldown');
      }
    }

    const targets = resolveTargets(skill.targetRule, hero, battleState);
    if (targets.length === 0 && skill.targetRule !== 'self') {
      return failure('no_targets');
    }

    const effectResults: SkillEffectResult[] = [];
    for (const effect of skill.effects) {
      const applied = this.applyEffect(hero, skill, effect, targets, battleState);
      effectResults.push(...applied);
    }

    if (skill.energyCost !== undefined) {
      hero.currentEnergy -= skill.energyCost;
      clampHeroEnergy(hero);
    }

    if (skill.trigger === 'cooldown' && skill.cooldownMs) {
      const cooldown = hero.runtimeKit.cooldowns.find((entry) => entry.skillId === skillId);
      if (cooldown) {
        cooldown.remainingMs = skill.cooldownMs;
        cooldown.totalCooldownMs = skill.cooldownMs;
      }
    }

    return {
      success: true,
      skillId,
      casterHeroId: hero.heroId,
      targets: targets.map((target) => ({
        unitId: getUnitId(target),
        side: target.side,
      })),
      effects: effectResults,
    };
  }

  private static findSkill(hero: BattleHero, skillId: string): HeroSkill | null {
    const kit = hero.runtimeKit?.kit;
    if (!kit) return null;

    if (kit.passive.id === skillId) return kit.passive;
    if (kit.ultimate.id === skillId) return kit.ultimate;

    const sideSkill = kit.sideSkills.find((skill) => skill.id === skillId);
    return sideSkill ?? null;
  }

  private static applyEffect(
    caster: BattleHero,
    skill: HeroSkill,
    effect: SkillEffect,
    skillTargets: BattleUnitRef[],
    battleState: BattleState,
  ): SkillEffectResult[] {
    const targets = this.resolveEffectTargets(caster, skill, effect, skillTargets, battleState);

    const results: SkillEffectResult[] = [];
    for (const target of targets) {
      if (!isUnitAlive(target) && effect.effectType !== 'revive') continue;

      switch (effect.effectType) {
        case 'move_to_target': {
          if (target.side === 'enemy') {
            const engageDist = caster.radius + target.unit.radius + 4;
            caster.x = Math.max(caster.radius, target.unit.x - engageDist);
            caster.y = target.unit.y;
            clampHeroPosition(caster);
          }
          results.push({
            effectType: 'move_to_target',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
          });
          break;
        }
        case 'damage': {
          let rawDamage = this.computeEffectAmount(caster, effect);
          if (
            effect.isolationBonus
            && target.side === 'enemy'
            && isEnemyIsolated(
              target.unit,
              battleState.enemies,
              effect.isolationRadius ?? HERO_NEW.LIN.ISOLATION_RADIUS,
            )
          ) {
            rawDamage = Math.floor(rawDamage * (1 + effect.isolationBonus));
          }
          const dealt = StatusEffectSystem.applyDamageWithMitigation(target, rawDamage);
          results.push({
            effectType: 'damage',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            amount: dealt,
          });
          break;
        }
        case 'heal': {
          const healAmount = Math.floor(
            this.computeEffectAmount(caster, effect)
            * StatusEffectSystem.getHealingMultiplier(target),
          );
          const before = target.unit.currentHP;
          target.unit.currentHP = Math.min(target.unit.maxHP, target.unit.currentHP + healAmount);
          results.push({
            effectType: 'heal',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            amount: target.unit.currentHP - before,
          });
          break;
        }
        case 'shield': {
          const shieldAmount = this.computeEffectAmount(caster, effect);
          StatusEffectSystem.applyStatus(target, 'shielded', {
            durationMs: effect.durationMs ?? 0,
            value: shieldAmount,
            sourceHeroId: caster.heroId,
          });
          results.push({
            effectType: 'shield',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            amount: shieldAmount,
          });
          break;
        }
        case 'apply_status':
        case 'stat_modifier': {
          const statusId = this.toStatusEffectId(effect.statusId);
          if (!statusId) break;
          StatusEffectSystem.applyStatus(target, statusId, {
            durationMs: effect.durationMs ?? 0,
            value: effect.flatAmount ?? 0,
            sourceHeroId: caster.heroId,
          });
          results.push({
            effectType: effect.effectType,
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            statusId,
            amount: effect.flatAmount,
          });
          break;
        }
        case 'remove_status': {
          const statusId = this.toStatusEffectId(effect.statusId);
          if (!statusId) break;
          StatusEffectSystem.removeStatus(target, statusId);
          results.push({
            effectType: 'remove_status',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            statusId,
          });
          break;
        }
        case 'gain_energy': {
          if (target.side !== 'hero') break;
          const gain = effect.flatAmount ?? 0;
          target.unit.currentEnergy = Math.min(COMBAT.ENERGY_MAX, target.unit.currentEnergy + gain);
          results.push({
            effectType: 'gain_energy',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            amount: gain,
          });
          break;
        }
        case 'summon_unit': {
          if (effect.summonId) {
            SummonUnitSystem.summonUnit(effect.summonId, caster, battleState);
          }
          results.push({
            effectType: 'summon_unit',
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            blocked: true,
          });
          break;
        }
        case 'revive':
          results.push({
            effectType: effect.effectType,
            targetUnitId: getUnitId(target),
            targetSide: target.side,
            blocked: true,
          });
          break;
        case 'detonate_status': {
          const statusId = this.toStatusEffectId(effect.statusId);
          if (!statusId) break;

          let totalStacks = 0;
          for (const enemy of battleState.enemies) {
            if (!enemy.isAlive) continue;
            const ref = enemyRef(enemy);
            const stacks = StatusEffectSystem.getStatusStacks(ref, statusId);
            if (stacks <= 0) continue;

            totalStacks += stacks;
            const perStack = this.computeEffectAmount(caster, effect);
            const dealt = StatusEffectSystem.applyDamageWithMitigation(
              ref,
              Math.floor(perStack * stacks),
            );
            results.push({
              effectType: 'detonate_status',
              targetUnitId: getUnitId(ref),
              targetSide: ref.side,
              amount: dealt,
              statusId,
            });
            StatusEffectSystem.removeStatus(ref, statusId);
          }

          if (totalStacks > 0) {
            results.push({
              effectType: 'detonate_status',
              targetUnitId: getUnitId(heroRef(caster)),
              targetSide: 'hero',
              amount: totalStacks,
              statusId,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    void skill;
    return results;
  }

  private static resolveEffectTargets(
    caster: BattleHero,
    skill: HeroSkill,
    effect: SkillEffect,
    skillTargets: BattleUnitRef[],
    battleState: BattleState,
  ): BattleUnitRef[] {
    if (effect.effectType === 'heal' || effect.effectType === 'shield') {
      return resolveTargets('all_allies', caster, battleState);
    }

    if (effect.effectType === 'gain_energy') {
      return skillTargets.length > 0 ? skillTargets : [heroRef(caster)];
    }

    if (effect.effectType === 'move_to_target') {
      return skillTargets;
    }

    if (effect.effectType === 'damage' && effect.maxTargets && effect.maxTargets > 1) {
      if (skill.targetRule === 'backline_enemy') {
        return resolveMultiBacklineEnemies(battleState, effect.maxTargets);
      }
      if (skill.targetRule === 'all_enemies') {
        return resolveTargets('all_enemies', caster, battleState).slice(0, effect.maxTargets);
      }
    }

    if (effect.area) {
      const anchoredRules: TargetRule[] = [
        'densest_enemy_cluster',
        'highest_atk_enemy',
        'backline_enemy',
        'lowest_hp_enemy',
        'nearest_enemy',
      ];
      if (anchoredRules.includes(skill.targetRule)) {
        const primary = resolveTargets(skill.targetRule, caster, battleState)[0];
        if (primary) {
          return resolveAreaAroundPoint(
            primary.unit,
            battleState.enemies,
            effect.area,
            effect.maxTargets,
          );
        }
      }
      return resolveAreaAroundCaster(
        caster,
        battleState.enemies,
        effect.area,
        effect.maxTargets,
      );
    }

    if (effect.effectType === 'detonate_status') {
      return resolveTargets('all_enemies', caster, battleState);
    }

    if (effect.effectType === 'apply_status' || effect.effectType === 'stat_modifier') {
      const statusId = this.toStatusEffectId(effect.statusId);
      const isDebuff = statusId ? getStatusEffectDefinition(statusId)?.isDebuff : true;
      if (!isDebuff) {
        return resolveTargets('all_allies', caster, battleState);
      }
    }

    if (effect.effectType === 'damage' && skill.targetRule === 'all_enemies') {
      return resolveTargets('all_enemies', caster, battleState);
    }

    if (effect.maxTargets && effect.maxTargets > 0) {
      return skillTargets.slice(0, effect.maxTargets);
    }

    return skillTargets;
  }

  private static computeEffectAmount(caster: BattleHero, effect: SkillEffect): number {
    let amount = effect.flatAmount ?? 0;
    if (effect.scaling) {
      amount += scaleStatValue(caster, effect.scaling.stat, effect.scaling.multiplier);
    }
    return Math.max(0, Math.floor(amount));
  }

  private static toStatusEffectId(statusId?: string): StatusEffectId | null {
    if (!statusId || !isKnownStatusEffect(statusId)) return null;
    return statusId as StatusEffectId;
  }
}
