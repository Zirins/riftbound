// src/data/bonds.ts
// Resonance Bond definitions — pairs, class bonuses, and catalog helpers (Section 16).

import { BONDS } from '../constants/gameConfig';
import { FACTION_LABELS } from './heroes';
import type {
  GlobalStatModifiers,
  HeroClass,
  HeroFaction,
} from '../types';

export const CLASS_BONUSES = {
  defensePercent: [0.02, 0.05],
} as const;

export interface PairBondDefinition {
  id: string;
  name: string;
  description: string;
  heroIds: [string, string];
  modifiers: GlobalStatModifiers;
}

export const PAIR_BOND_DEFINITIONS: PairBondDefinition[] = [
  {
    id: 'pair_kael_thane',
    name: 'Iron Bastion',
    description: 'Tie Shan and Yan Gen stand together.',
    heroIds: ['kael', 'thane_ironroot'],
    modifiers: { hpPercent: 0.03 },
  },
  {
    id: 'pair_mira_caira',
    name: 'Radiant Veil',
    description: 'Ling Yu and Xi Wei share the morning light.',
    heroIds: ['mira', 'caira_dawnveil'],
    modifiers: { hpPercent: 0.03 },
  },
  {
    id: 'pair_sura_marek',
    name: 'Stormbound Oath',
    description: 'Chi Feng and Cang Lei charge as one.',
    heroIds: ['sura', 'marek_stormreign'],
    modifiers: { attackPercent: 0.03 },
  },
  {
    id: 'pair_nyra_ren',
    name: 'Veil Hunters',
    description: 'Yu Han and Mo Xi strike from the shadows.',
    heroIds: ['nyra', 'ren_vale'],
    modifiers: { attackPercent: 0.02 },
  },
  {
    id: 'pair_solenne_veyra',
    name: 'Mirror Arc',
    description: 'Su Lei and Huan Li refract the battlefield.',
    heroIds: ['solenne_arclight', 'veyra_hollowglass'],
    modifiers: { defensePercent: 0.03 },
  },
];

export const CLASS_LABELS: Record<HeroClass, string> = {
  tank: 'Tank',
  fighter: 'Fighter',
  assassin: 'Assassin',
  mage: 'Mage',
  support: 'Support',
  ranger: 'Ranger',
};

export const FACTION_IDS: HeroFaction[] = ['argent', 'radiant', 'freebound', 'hollow'];

export const CLASS_IDS: HeroClass[] = ['tank', 'fighter', 'assassin', 'mage', 'support', 'ranger'];

export function getHighestTierIndex(count: number, thresholds: readonly number[]): number {
  let tierIndex = -1;
  for (let index = 0; index < thresholds.length; index += 1) {
    if (count >= thresholds[index]) {
      tierIndex = index;
    }
  }
  return tierIndex;
}

export function formatModifierSummary(modifiers: GlobalStatModifiers): string {
  const parts: string[] = [];
  if (modifiers.hp) parts.push(`HP+${modifiers.hp}`);
  if (modifiers.attack) parts.push(`ATK+${modifiers.attack}`);
  if (modifiers.defense) parts.push(`DEF+${modifiers.defense}`);
  if (modifiers.hpPercent) parts.push(`HP+${Math.round(modifiers.hpPercent * 100)}%`);
  if (modifiers.attackPercent) parts.push(`ATK+${Math.round(modifiers.attackPercent * 100)}%`);
  if (modifiers.defensePercent) parts.push(`DEF+${Math.round(modifiers.defensePercent * 100)}%`);
  if (modifiers.energyRegenPercent) {
    parts.push(`Energy regen+${Math.round(modifiers.energyRegenPercent * 100)}%`);
  }
  if (modifiers.campaignGoldPercent) {
    parts.push(`Campaign Gold+${Math.round(modifiers.campaignGoldPercent * 100)}%`);
  }
  if (modifiers.covenantCoinGainPercent) {
    parts.push(`Sect Coin gain+${Math.round(modifiers.covenantCoinGainPercent * 100)}%`);
  }
  return parts.length > 0 ? parts.join(', ') : 'No bonus';
}

export function mergeGlobalModifiers(
  target: GlobalStatModifiers,
  source: GlobalStatModifiers,
): GlobalStatModifiers {
  return {
    hp: (target.hp ?? 0) + (source.hp ?? 0),
    attack: (target.attack ?? 0) + (source.attack ?? 0),
    defense: (target.defense ?? 0) + (source.defense ?? 0),
    hpPercent: (target.hpPercent ?? 0) + (source.hpPercent ?? 0),
    attackPercent: (target.attackPercent ?? 0) + (source.attackPercent ?? 0),
    defensePercent: (target.defensePercent ?? 0) + (source.defensePercent ?? 0),
    energyRegenPercent: (target.energyRegenPercent ?? 0) + (source.energyRegenPercent ?? 0),
    campaignGoldPercent: (target.campaignGoldPercent ?? 0) + (source.campaignGoldPercent ?? 0),
    covenantCoinGainPercent: (target.covenantCoinGainPercent ?? 0) + (source.covenantCoinGainPercent ?? 0),
  };
}

export function getFactionTierModifier(tierIndex: number): GlobalStatModifiers {
  if (tierIndex < 0) return {};
  return { attackPercent: BONDS.FACTION_BONUSES.atkPercent[tierIndex] };
}

export function getClassTierModifier(tierIndex: number): GlobalStatModifiers {
  if (tierIndex < 0) return {};
  return { defensePercent: CLASS_BONUSES.defensePercent[tierIndex] };
}

export function getCollectionTierModifier(tierIndex: number): GlobalStatModifiers {
  if (tierIndex < 0) return {};
  return { hpPercent: BONDS.COLLECTION_BONUSES.hpPercent[tierIndex] };
}

export function getFactionBondId(faction: HeroFaction, threshold: number): string {
  return `faction_${faction}_${threshold}`;
}

export function getClassBondId(heroClass: HeroClass, threshold: number): string {
  return `class_${heroClass}_${threshold}`;
}

export function getCollectionBondId(threshold: number): string {
  return `collection_${threshold}`;
}

export function getFactionLabel(faction: HeroFaction): string {
  return FACTION_LABELS[faction];
}
