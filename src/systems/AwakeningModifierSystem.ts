// src/systems/AwakeningModifierSystem.ts
// Applies awakening skillModifiers to a hero runtime kit at initialization.

import {
  collectModifiersThroughLevel,
  findSkillInKit,
} from '../data/awakeningData';
import type {
  HeroCombatKit,
  HeroSkill,
  RuntimeHeroKit,
  SkillEffect,
  SkillModifier,
} from '../types';

export class AwakeningModifierSystem {
  static buildRuntimeHeroKit(
    baseKit: HeroCombatKit,
    awakeningLevel: 0 | 1 | 2 | 3,
  ): RuntimeHeroKit {
    const modifiedKit = AwakeningModifierSystem.applyModifiersToKit(baseKit, awakeningLevel);
    return {
      kit: modifiedKit,
      awakeningLevel,
      cooldowns: modifiedKit.sideSkills.map((sideSkill) => ({
        skillId: sideSkill.id,
        remainingMs: sideSkill.initialCooldownMs ?? sideSkill.cooldownMs ?? 0,
        totalCooldownMs: sideSkill.cooldownMs ?? 0,
      })),
    };
  }

  static applyModifiersToKit(
    baseKit: HeroCombatKit,
    awakeningLevel: 0 | 1 | 2 | 3,
  ): HeroCombatKit {
    let kit = cloneKit(baseKit);
    if (awakeningLevel <= 0) return kit;

    const modifiers = collectModifiersThroughLevel(baseKit.heroId, awakeningLevel);
    for (const modifier of modifiers) {
      kit = AwakeningModifierSystem.applyModifier(kit, modifier);
    }
    return kit;
  }

  static getAppliedModifiers(
    heroId: string,
    awakeningLevel: number,
  ): SkillModifier[] {
    return collectModifiersThroughLevel(heroId, awakeningLevel);
  }

  private static applyModifier(
    kit: HeroCombatKit,
    modifier: SkillModifier,
  ): HeroCombatKit {
    const skill = findSkillInKit(kit, modifier.targetSkillId);
    if (!skill) return kit;

    const updatedSkill = applyModifierToSkill(skill, modifier);
    return replaceSkillInKit(kit, updatedSkill);
  }
}

function cloneKit(kit: HeroCombatKit): HeroCombatKit {
  return structuredClone(kit);
}

function applyModifierToSkill(skill: HeroSkill, modifier: SkillModifier): HeroSkill {
  const updated: HeroSkill = {
    ...skill,
    effects: skill.effects.map((effect) => ({ ...effect, scaling: effect.scaling ? { ...effect.scaling } : undefined })),
  };

  switch (modifier.modifierType) {
    case 'increase_multiplier':
      updated.effects = updated.effects.map((effect) => increaseEffectMultiplier(effect, Number(modifier.value)));
      break;
    case 'increase_duration':
      updated.effects = updated.effects.map((effect) => (
        effect.durationMs !== undefined
          ? { ...effect, durationMs: effect.durationMs + Number(modifier.value) }
          : effect
      ));
      if (updated.cooldownMs !== undefined) {
        updated.cooldownMs += Number(modifier.value);
      }
      break;
    case 'reduce_cooldown':
      if (updated.cooldownMs !== undefined) {
        updated.cooldownMs = Math.max(0, updated.cooldownMs - Number(modifier.value));
      }
      break;
    case 'increase_target_count':
      updated.effects = updated.effects.map((effect) => ({
        ...effect,
        maxTargets: (effect.maxTargets ?? 1) + Number(modifier.value),
      }));
      break;
    case 'add_status':
      updated.effects = [
        ...updated.effects,
        {
          effectType: 'apply_status',
          statusId: String(modifier.value),
          durationMs: 3000,
        },
      ];
      break;
    case 'add_effect':
      if (typeof modifier.value === 'object') {
        updated.effects = [...updated.effects, structuredClone(modifier.value)];
      }
      break;
    case 'upgrade_summon':
      break;
    default:
      break;
  }

  return updated;
}

function increaseEffectMultiplier(effect: SkillEffect, bonus: number): SkillEffect {
  if (effect.scaling) {
    return {
      ...effect,
      scaling: {
        ...effect.scaling,
        multiplier: effect.scaling.multiplier + bonus,
      },
    };
  }

  if (effect.flatAmount !== undefined && (effect.effectType === 'damage' || effect.effectType === 'heal')) {
    return {
      ...effect,
      flatAmount: Math.floor(effect.flatAmount * (1 + bonus)),
    };
  }

  return effect;
}

function replaceSkillInKit(kit: HeroCombatKit, skill: HeroSkill): HeroCombatKit {
  if (kit.passive.id === skill.id) {
    return { ...kit, passive: skill };
  }
  if (kit.ultimate.id === skill.id) {
    return { ...kit, ultimate: skill };
  }

  return {
    ...kit,
    sideSkills: kit.sideSkills.map((entry) => (entry.id === skill.id ? skill : entry)) as HeroCombatKit['sideSkills'],
  };
}
