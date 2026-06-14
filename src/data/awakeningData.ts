// src/data/awakeningData.ts
// Awakening progression data — costs, tracks, and display helpers (Section 15).

import { AWAKENING } from '../constants/gameConfig';
import { getHeroCombatKit } from './heroKits';
import type {
  AwakeningCost,
  AwakeningLevelData,
  HeroCombatKit,
  SkillModifier,
} from '../types';

export const AWAKENING_CRYSTAL_ITEM_ID = 'awakening_crystal';

export function getAwakeningTrack(heroId: string): HeroCombatKit['awakeningTrack'] | null {
  return getHeroCombatKit(heroId)?.awakeningTrack ?? null;
}

export function getAwakeningLevelData(
  heroId: string,
  level: 1 | 2 | 3,
): AwakeningLevelData | null {
  const track = getAwakeningTrack(heroId);
  return track?.[level - 1] ?? null;
}

export function getStandardAwakeningCost(levelIndex: 0 | 1 | 2): AwakeningCost {
  return {
    gold: AWAKENING.GOLD_COSTS[levelIndex],
    awakeningCrystals: AWAKENING.CRYSTAL_COSTS[levelIndex],
  };
}

export function getNextAwakeningCostForLevel(currentLevel: number): AwakeningCost | null {
  if (currentLevel < 0 || currentLevel >= AWAKENING.MAX_LEVEL) return null;
  return getStandardAwakeningCost(currentLevel as 0 | 1 | 2);
}

export function findSkillInKit(kit: HeroCombatKit, skillId: string) {
  if (kit.passive.id === skillId) return kit.passive;
  if (kit.ultimate.id === skillId) return kit.ultimate;
  return kit.sideSkills.find((skill) => skill.id === skillId) ?? null;
}

export function formatSkillModifier(modifier: SkillModifier, kit: HeroCombatKit): string {
  const skill = findSkillInKit(kit, modifier.targetSkillId);
  const skillName = skill?.name ?? modifier.targetSkillId;

  switch (modifier.modifierType) {
    case 'increase_multiplier':
      return `${skillName}: +${Math.round(Number(modifier.value) * 100)}% power`;
    case 'increase_duration':
      return `${skillName}: +${Math.round(Number(modifier.value) / 1000)}s duration`;
    case 'reduce_cooldown':
      return `${skillName}: -${Math.round(Number(modifier.value) / 1000)}s cooldown`;
    case 'increase_target_count':
      return `${skillName}: +${modifier.value} targets`;
    case 'add_status':
      return `${skillName}: adds ${modifier.value} status`;
    case 'add_effect':
      return `${skillName}: gains an extra effect`;
    case 'upgrade_summon':
      return `${skillName}: upgraded summon`;
    default:
      return `${skillName}: ${modifier.modifierType}`;
  }
}

export function collectModifiersThroughLevel(
  heroId: string,
  awakeningLevel: number,
): SkillModifier[] {
  const track = getAwakeningTrack(heroId);
  if (!track || awakeningLevel <= 0) return [];

  const modifiers: SkillModifier[] = [];
  for (let level = 1; level <= Math.min(awakeningLevel, AWAKENING.MAX_LEVEL); level += 1) {
    modifiers.push(...track[level - 1].skillModifiers);
  }
  return modifiers;
}
