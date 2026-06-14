// src/data/sigils.ts
// V2 Sigil definitions — 30 artifacts across rarities and elements (Section 14).

import type {
  ElementType,
  EquipmentSigilRarity,
  SigilDefinition,
  SigilDropSource,
  SigilPassiveModifier,
  SigilStatType,
} from '../types';

const RARITIES: EquipmentSigilRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const PRIMARY_VALUES: Record<EquipmentSigilRarity, Record<'hp' | 'attack' | 'defense', number>> = {
  common: { hp: 120, attack: 8, defense: 6 },
  uncommon: { hp: 200, attack: 14, defense: 10 },
  rare: { hp: 320, attack: 22, defense: 16 },
  epic: { hp: 480, attack: 34, defense: 24 },
  legendary: { hp: 720, attack: 52, defense: 36 },
};

const SIGIL_ELEMENT_ROWS: {
  element: ElementType;
  nameStem: string;
  primaryStat: 'hp' | 'attack' | 'defense';
  secondaryPool: SigilStatType[];
  passive?: SigilPassiveModifier;
  dropSources: SigilDropSource[];
}[] = [
  {
    element: 'iron',
    nameStem: 'Iron Ward',
    primaryStat: 'hp',
    secondaryPool: ['defense', 'hpPercent', 'defensePercent'],
    dropSources: ['campaign', 'void_trial'],
  },
  {
    element: 'flame',
    nameStem: 'Ember Brand',
    primaryStat: 'attack',
    secondaryPool: ['attack', 'attackPercent', 'attackSpeedPercent'],
    passive: { passiveEffectId: 'ember_sigil_burn_chance', value: 0.05 },
    dropSources: ['campaign', 'shop'],
  },
  {
    element: 'storm',
    nameStem: 'Storm Vein',
    primaryStat: 'defense',
    secondaryPool: ['defense', 'attackSpeedPercent', 'energyGain'],
    dropSources: ['campaign', 'void_trial'],
  },
  {
    element: 'frost',
    nameStem: 'Frost Rime',
    primaryStat: 'hp',
    secondaryPool: ['hp', 'defense', 'hpPercent'],
    dropSources: ['campaign', 'covenant_boss'],
  },
  {
    element: 'void',
    nameStem: 'Void Flicker',
    primaryStat: 'attack',
    secondaryPool: ['attack', 'attackPercent', 'energyGain'],
    passive: { passiveEffectId: 'void_sigil_echo_damage', value: 0.08 },
    dropSources: ['void_trial', 'gacha'],
  },
  {
    element: 'light',
    nameStem: 'Dawn Seal',
    primaryStat: 'defense',
    secondaryPool: ['defense', 'hpPercent', 'energyGain'],
    dropSources: ['campaign', 'shop'],
  },
];

const RARITY_SUFFIX: Record<EquipmentSigilRarity, string> = {
  common: 'Fragment',
  uncommon: 'Shard',
  rare: 'Sigil',
  epic: 'Crest',
  legendary: 'Relic',
};

function buildSigilId(element: ElementType, rarity: EquipmentSigilRarity): string {
  return `${element}_${rarity}_sigil`;
}

function buildSigil(
  row: (typeof SIGIL_ELEMENT_ROWS)[number],
  rarity: EquipmentSigilRarity,
): SigilDefinition {
  const includePassive = rarity === 'epic' || rarity === 'legendary';
  return {
    id: buildSigilId(row.element, rarity),
    name: `${row.nameStem} ${RARITY_SUFFIX[rarity]}`,
    rarity,
    element: row.element,
    primaryStat: {
      statType: row.primaryStat,
      value: PRIMARY_VALUES[rarity][row.primaryStat],
    },
    secondaryStatPool: row.secondaryPool,
    passiveModifier: includePassive ? row.passive : undefined,
    dropSources: row.dropSources,
  };
}

export const SIGIL_DEFINITIONS: SigilDefinition[] = SIGIL_ELEMENT_ROWS.flatMap((row) => (
  RARITIES.map((rarity) => buildSigil(row, rarity))
));

const SIGIL_BY_ID = new Map(SIGIL_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getSigilDefinition(definitionId: string): SigilDefinition | null {
  return SIGIL_BY_ID.get(definitionId) ?? null;
}

export function getAllSigilDefinitions(): SigilDefinition[] {
  return SIGIL_DEFINITIONS;
}

export const SIGIL_LEVEL_SCALE_PER_LEVEL = 0.1;

export const SECONDARY_STAT_VALUES: Record<
  EquipmentSigilRarity,
  Record<SigilStatType, number>
> = {
  common: {
    hp: 40,
    hpPercent: 0.02,
    attack: 3,
    attackPercent: 0.02,
    defense: 2,
    defensePercent: 0.02,
    attackSpeedPercent: 0.01,
    energyGain: 2,
  },
  uncommon: {
    hp: 80,
    hpPercent: 0.03,
    attack: 6,
    attackPercent: 0.03,
    defense: 5,
    defensePercent: 0.03,
    attackSpeedPercent: 0.015,
    energyGain: 4,
  },
  rare: {
    hp: 140,
    hpPercent: 0.04,
    attack: 10,
    attackPercent: 0.04,
    defense: 8,
    defensePercent: 0.04,
    attackSpeedPercent: 0.02,
    energyGain: 6,
  },
  epic: {
    hp: 220,
    hpPercent: 0.05,
    attack: 16,
    attackPercent: 0.05,
    defense: 12,
    defensePercent: 0.05,
    attackSpeedPercent: 0.025,
    energyGain: 8,
  },
  legendary: {
    hp: 350,
    hpPercent: 0.06,
    attack: 25,
    attackPercent: 0.06,
    defense: 20,
    defensePercent: 0.06,
    attackSpeedPercent: 0.03,
    energyGain: 10,
  },
};

export function scalePrimaryStatValue(baseValue: number, level: number): number {
  const clampedLevel = Math.max(1, level);
  return Math.floor(baseValue * (1 + SIGIL_LEVEL_SCALE_PER_LEVEL * (clampedLevel - 1)));
}

export function rollSecondaryStat(
  definition: SigilDefinition,
  breakthroughIndex: number,
): { statType: SigilStatType; value: number } {
  const pool = definition.secondaryStatPool;
  const statType = pool[breakthroughIndex % pool.length];
  const value = SECONDARY_STAT_VALUES[definition.rarity][statType];
  return { statType, value };
}
