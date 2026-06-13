// src/data/statusEffects.ts
// V2 status effect definitions — referenced by hero kit SkillEffects (Section 13.3).

import type { StatusEffectDefinition } from '../types';

export const STATUS_EFFECTS: StatusEffectDefinition[] = [
  {
    id: 'stun',
    name: 'Stunned',
    description: 'Cannot move or attack while stunned.',
    isDebuff: true,
    maxStacks: 1,
  },
  {
    id: 'silence',
    name: 'Silenced',
    description: 'Cannot cast ultimate or side skills. Basic attacks still allowed.',
    isDebuff: true,
    maxStacks: 1,
  },
  {
    id: 'wound',
    name: 'Wounded',
    description: 'Healing received is reduced.',
    isDebuff: true,
    maxStacks: 3,
  },
  {
    id: 'burn',
    name: 'Burning',
    description: 'Takes flame damage over time.',
    isDebuff: true,
    maxStacks: 3,
  },
  {
    id: 'shielded',
    name: 'Shielded',
    description: 'Absorbs incoming damage before HP is reduced.',
    isDebuff: false,
    maxStacks: 1,
  },
  {
    id: 'haste',
    name: 'Haste',
    description: 'Attack and movement speed increased.',
    isDebuff: false,
    maxStacks: 1,
  },
  {
    id: 'slow',
    name: 'Slowed',
    description: 'Attack and movement speed reduced.',
    isDebuff: true,
    maxStacks: 3,
  },
  {
    id: 'vulnerable',
    name: 'Vulnerable',
    description: 'Damage received is increased.',
    isDebuff: true,
    maxStacks: 3,
  },
  {
    id: 'damage_reduction',
    name: 'Fortified',
    description: 'Damage received is reduced.',
    isDebuff: false,
    maxStacks: 3,
  },
  {
    id: 'atk_up',
    name: 'Attack Up',
    description: 'Attack power increased.',
    isDebuff: false,
    maxStacks: 5,
  },
  {
    id: 'def_up',
    name: 'Defense Up',
    description: 'Defense increased.',
    isDebuff: false,
    maxStacks: 5,
  },
];

const STATUS_BY_ID = new Map(STATUS_EFFECTS.map((status) => [status.id, status]));

export function getStatusEffectDefinition(statusId: string): StatusEffectDefinition | undefined {
  return STATUS_BY_ID.get(statusId as StatusEffectDefinition['id']);
}

export function isKnownStatusEffect(statusId: string): boolean {
  return STATUS_BY_ID.has(statusId as StatusEffectDefinition['id']);
}
