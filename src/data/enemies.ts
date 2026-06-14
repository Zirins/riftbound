// src/data/enemies.ts
// Enemy definitions — Chapter 1–3 (Sections 18–19).

import { COMBAT, ENEMIES, WARDEN } from '../constants/gameConfig';
import type { EnemyClass, EnemyTargetingRule } from '../types';

export const ENEMY_IDS = {
  GRUNT: ENEMIES.GRUNT.ID,
  SPECTER: ENEMIES.SPECTER.ID,
  IRONCLAD: ENEMIES.IRONCLAD.ID,
  INVOKER: ENEMIES.INVOKER.ID,
  WARDEN: WARDEN.ID,
  RIFT_PHANTOM: 'rift_phantom',
  HOLLOW_SENTINEL: 'hollow_sentinel',
  HOLLOW_WARDEN: 'hollow_warden',
  IRONREACH_CRUSHER: 'ironreach_crusher',
  IRONREACH_INVOKER_ELITE: 'ironreach_invoker_elite',
  IRONREACH_TITAN: 'ironreach_titan',
} as const;

export interface EnemySkillSpec {
  id: string;
  name: string;
  cooldownMs: number;
  telegraphMs?: number;
}

export interface EnemyBossTraits {
  silenceImmune?: boolean;
  stunDurationMultiplier?: number;
  knockbackImmune?: boolean;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  enemyClass: EnemyClass;
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  moveSpeed: number;
  attackCooldown: number;
  attackRange: number;
  radius: number;
  color: number;
  isBoss: boolean;
  targetingRule?: EnemyTargetingRule;
  dodgeChance?: number;
  basicAttackDamageReduction?: number;
  basicAttackMultiplier?: number;
  bossTraits?: EnemyBossTraits;
  skills: EnemySkillSpec[];
}

export interface EnemySpawnTemplate {
  id: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  attackCooldown: number;
  attackRange: number;
  radius: number;
  targetingRule?: EnemyTargetingRule;
  dodgeChance?: number;
  basicAttackDamageReduction?: number;
  basicAttackMultiplier?: number;
  isBoss: boolean;
  bossTraits?: EnemyBossTraits;
}

const CHAPTER2_SCALED = {
  PHANTOM: { HP: 750, ATK: 90, DEF: 20 },
  SENTINEL: { HP: 1100, ATK: 55, DEF: 50 },
} as const;

const CHAPTER3_SCALED = {
  CRUSHER: { HP: 1500, ATK: 120, DEF: 90 },
  INVOKER_ELITE: { HP: 1000, ATK: 135, DEF: 35 },
} as const;

export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  {
    id: ENEMY_IDS.GRUNT,
    name: 'Rift Grunt',
    enemyClass: 'melee',
    baseHP: ENEMIES.GRUNT.HP,
    baseAttack: ENEMIES.GRUNT.ATTACK,
    baseDefense: ENEMIES.GRUNT.DEFENSE,
    moveSpeed: ENEMIES.GRUNT.SPEED,
    attackCooldown: ENEMIES.GRUNT.ATTACK_COOLDOWN,
    attackRange: ENEMIES.GRUNT.ATTACK_RANGE,
    radius: ENEMIES.GRUNT.RADIUS,
    color: ENEMIES.GRUNT.COLOR,
    isBoss: false,
    skills: [],
  },
  {
    id: ENEMY_IDS.SPECTER,
    name: 'Rift Specter',
    enemyClass: 'ranged',
    baseHP: ENEMIES.SPECTER.HP,
    baseAttack: ENEMIES.SPECTER.ATTACK,
    baseDefense: ENEMIES.SPECTER.DEFENSE,
    moveSpeed: ENEMIES.SPECTER.SPEED,
    attackCooldown: ENEMIES.SPECTER.ATTACK_COOLDOWN,
    attackRange: ENEMIES.SPECTER.ATTACK_RANGE,
    radius: ENEMIES.SPECTER.RADIUS,
    color: ENEMIES.SPECTER.COLOR,
    isBoss: false,
    skills: [],
  },
  {
    id: ENEMY_IDS.IRONCLAD,
    name: 'Rift Ironclad',
    enemyClass: 'armored',
    baseHP: ENEMIES.IRONCLAD.HP,
    baseAttack: ENEMIES.IRONCLAD.ATTACK,
    baseDefense: ENEMIES.IRONCLAD.DEFENSE,
    moveSpeed: ENEMIES.IRONCLAD.SPEED,
    attackCooldown: ENEMIES.IRONCLAD.ATTACK_COOLDOWN,
    attackRange: ENEMIES.IRONCLAD.ATTACK_RANGE,
    radius: ENEMIES.IRONCLAD.RADIUS,
    color: ENEMIES.IRONCLAD.COLOR,
    isBoss: false,
    skills: [],
  },
  {
    id: ENEMY_IDS.INVOKER,
    name: 'Rift Invoker',
    enemyClass: 'mage',
    baseHP: ENEMIES.INVOKER.HP,
    baseAttack: ENEMIES.INVOKER.ATTACK,
    baseDefense: ENEMIES.INVOKER.DEFENSE,
    moveSpeed: ENEMIES.INVOKER.SPEED,
    attackCooldown: ENEMIES.INVOKER.ATTACK_COOLDOWN,
    attackRange: ENEMIES.INVOKER.ATTACK_RANGE,
    radius: ENEMIES.INVOKER.RADIUS,
    color: ENEMIES.INVOKER.COLOR,
    isBoss: false,
    skills: [],
  },
  {
    id: ENEMY_IDS.WARDEN,
    name: 'Rift Warden',
    enemyClass: 'boss',
    baseHP: WARDEN.HP,
    baseAttack: WARDEN.ATTACK,
    baseDefense: WARDEN.DEFENSE,
    moveSpeed: WARDEN.SPEED,
    attackCooldown: WARDEN.ATTACK_COOLDOWN,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: WARDEN.RADIUS,
    color: WARDEN.COLOR,
    isBoss: true,
    skills: [
      { id: 'rift_slam', name: 'Rift Slam', cooldownMs: WARDEN.SLAM_INTERVAL, telegraphMs: WARDEN.SLAM_DELAY },
      { id: 'summon_adds', name: 'Summon Adds', cooldownMs: WARDEN.SUMMON_INTERVAL },
    ],
  },
  {
    id: ENEMY_IDS.RIFT_PHANTOM,
    name: 'Rift Phantom',
    enemyClass: 'melee',
    baseHP: CHAPTER2_SCALED.PHANTOM.HP,
    baseAttack: CHAPTER2_SCALED.PHANTOM.ATK,
    baseDefense: CHAPTER2_SCALED.PHANTOM.DEF,
    moveSpeed: 150,
    attackCooldown: 1000,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: 16,
    color: 0x7744aa,
    isBoss: false,
    targetingRule: 'lowest_hp_backline',
    dodgeChance: 0.25,
    skills: [
      { id: 'phase_cut', name: 'Phase Cut', cooldownMs: 6000, telegraphMs: 400 },
    ],
  },
  {
    id: ENEMY_IDS.HOLLOW_SENTINEL,
    name: 'Hollow Sentinel',
    enemyClass: 'ranged',
    baseHP: CHAPTER2_SCALED.SENTINEL.HP,
    baseAttack: CHAPTER2_SCALED.SENTINEL.ATK,
    baseDefense: CHAPTER2_SCALED.SENTINEL.DEF,
    moveSpeed: 70,
    attackCooldown: 1800,
    attackRange: 240,
    radius: 18,
    color: 0x553366,
    isBoss: false,
    skills: [
      { id: 'hollow_bulwark', name: 'Hollow Bulwark', cooldownMs: 8000, telegraphMs: 600 },
    ],
    basicAttackMultiplier: 0.8,
  },
  {
    id: ENEMY_IDS.HOLLOW_WARDEN,
    name: 'Hollow Warden',
    enemyClass: 'boss',
    baseHP: 9000,
    baseAttack: 150,
    baseDefense: 70,
    moveSpeed: 45,
    attackCooldown: 3500,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: 38,
    color: 0x6622aa,
    isBoss: true,
    bossTraits: { silenceImmune: true, stunDurationMultiplier: 0.5 },
    basicAttackMultiplier: 1.0,
    skills: [
      { id: 'silence_field', name: 'Silence Field', cooldownMs: 10000, telegraphMs: 1200 },
      { id: 'warden_pulse', name: 'Warden Pulse', cooldownMs: 7000 },
    ],
  },
  {
    id: ENEMY_IDS.IRONREACH_CRUSHER,
    name: 'Ironreach Crusher',
    enemyClass: 'armored',
    baseHP: CHAPTER3_SCALED.CRUSHER.HP,
    baseAttack: CHAPTER3_SCALED.CRUSHER.ATK,
    baseDefense: CHAPTER3_SCALED.CRUSHER.DEF,
    moveSpeed: 65,
    attackCooldown: 1600,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: 22,
    color: 0x556677,
    isBoss: false,
    targetingRule: 'frontline_tank',
    basicAttackDamageReduction: 0.20,
    basicAttackMultiplier: 1.0,
    skills: [
      { id: 'iron_slam', name: 'Iron Slam', cooldownMs: 7000, telegraphMs: 800 },
    ],
  },
  {
    id: ENEMY_IDS.IRONREACH_INVOKER_ELITE,
    name: 'Ironreach Invoker Elite',
    enemyClass: 'mage',
    baseHP: CHAPTER3_SCALED.INVOKER_ELITE.HP,
    baseAttack: CHAPTER3_SCALED.INVOKER_ELITE.ATK,
    baseDefense: CHAPTER3_SCALED.INVOKER_ELITE.DEF,
    moveSpeed: 55,
    attackCooldown: 2200,
    attackRange: 360,
    radius: 16,
    color: 0xcc6622,
    isBoss: false,
    basicAttackMultiplier: 0.9,
    skills: [
      { id: 'ember_bolt', name: 'Ember Bolt', cooldownMs: 5000 },
      { id: 'rift_spark', name: 'Rift Spark', cooldownMs: 9000 },
    ],
  },
  {
    id: ENEMY_IDS.IRONREACH_TITAN,
    name: 'Ironreach Titan',
    enemyClass: 'boss',
    baseHP: 15000,
    baseAttack: 210,
    baseDefense: 120,
    moveSpeed: 35,
    attackCooldown: 4200,
    attackRange: COMBAT.MELEE_ATTACK_RANGE,
    radius: 42,
    color: 0x334455,
    isBoss: true,
    bossTraits: { silenceImmune: true, knockbackImmune: true, stunDurationMultiplier: 0.5 },
    basicAttackMultiplier: 1.1,
    skills: [
      { id: 'titan_quake', name: 'Titan Quake', cooldownMs: 11000, telegraphMs: 1500 },
      { id: 'call_crushers', name: 'Call Crushers', cooldownMs: 14000 },
    ],
  },
];

const ENEMY_BY_ID = new Map(ENEMY_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getEnemyDefinition(enemyId: string): EnemyDefinition | null {
  return ENEMY_BY_ID.get(enemyId) ?? null;
}

export function getEnemySpawnTemplate(enemyId: string): EnemySpawnTemplate | null {
  const definition = getEnemyDefinition(enemyId);
  if (!definition) return null;

  return {
    id: definition.id,
    hp: definition.baseHP,
    attack: definition.baseAttack,
    defense: definition.baseDefense,
    speed: definition.moveSpeed,
    attackCooldown: definition.attackCooldown,
    attackRange: definition.attackRange,
    radius: definition.radius,
    targetingRule: definition.targetingRule,
    dodgeChance: definition.dodgeChance,
    basicAttackDamageReduction: definition.basicAttackDamageReduction,
    basicAttackMultiplier: definition.basicAttackMultiplier,
    isBoss: definition.isBoss,
    bossTraits: definition.bossTraits,
  };
}

export function getEnemyDisplayName(enemyId: string): string {
  return getEnemyDefinition(enemyId)?.name ?? enemyId;
}

export function getEnemyColor(enemyId: string): number {
  return getEnemyDefinition(enemyId)?.color ?? ENEMIES.GRUNT.COLOR;
}

export function isBossEnemyId(enemyId: string): boolean {
  return getEnemyDefinition(enemyId)?.isBoss ?? false;
}

export const ENEMY_DISPLAY_LABELS: Record<string, string> = Object.fromEntries(
  ENEMY_DEFINITIONS.map((definition) => [definition.id, definition.name]),
);
