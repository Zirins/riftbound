// src/data/covenantBosses.ts
// Weekly Sect boss pool — reuses campaign Ch2/3 enemy mechanics (Section 26.2).

import type { WaveConfig } from '../types';

export interface CovenantBossDefinition {
  id: string;
  name: string;
  mechanicSummary: string;
  description: string;
  maxHp: number;
  /** Shared-pool damage dealt on a full battle victory. */
  damagePerVictory: number;
  waves: WaveConfig[];
}

export const COVENANT_BOSSES: CovenantBossDefinition[] = [
  {
    id: 'rift_behemoth',
    name: 'Rift Behemoth',
    mechanicSummary: 'HP sponge — frontal slam',
    description: 'A towering Rift Warden grown fat on ley energy. Its Rift Slam punishes the front line.',
    maxHp: 1_000_000,
    damagePerVictory: 130_000,
    waves: [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'rift_grunt', count: 4 },
          { enemyId: 'rift_ironclad', count: 2 },
        ],
        isBossWave: false,
        statScale: 1.25,
      },
      {
        waveIndex: 1,
        enemies: [{ enemyId: 'rift_warden', count: 1 }],
        isBossWave: true,
        statScale: 1.4,
      },
    ],
  },
  {
    id: 'hollow_matron',
    name: 'Hollow Matron',
    mechanicSummary: 'Summoner — summons adds',
    description: 'The Hollow Warden calls Hollow Sentinels to shield her Silence Field.',
    maxHp: 1_000_000,
    damagePerVictory: 125_000,
    waves: [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'hollow_sentinel', count: 3 },
          { enemyId: 'rift_phantom', count: 2 },
        ],
        isBossWave: false,
        statScale: 1.2,
      },
      {
        waveIndex: 1,
        enemies: [
          { enemyId: 'hollow_warden', count: 1 },
          { enemyId: 'hollow_sentinel', count: 2 },
        ],
        isBossWave: true,
        statScale: 1.35,
      },
    ],
  },
  {
    id: 'iron_tyrant',
    name: 'Iron Tyrant',
    mechanicSummary: 'Armored — high DEF, quake',
    description: 'An Ironreach Titan whose armor shrugs off weak blows. Beware Titan Quake.',
    maxHp: 1_050_000,
    damagePerVictory: 120_000,
    waves: [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'ironreach_crusher', count: 3 },
        ],
        isBossWave: false,
        statScale: 1.2,
      },
      {
        waveIndex: 1,
        enemies: [
          { enemyId: 'ironreach_titan', count: 1 },
          { enemyId: 'ironreach_crusher', count: 2 },
        ],
        isBossWave: true,
        statScale: 1.4,
      },
    ],
  },
  {
    id: 'ember_leviathan',
    name: 'Ember Leviathan',
    mechanicSummary: 'Burn boss — burn over time',
    description: 'A blazing Ironreach Invoker Elite that scorches the back line with Ember Bolt.',
    maxHp: 950_000,
    damagePerVictory: 135_000,
    waves: [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'ironreach_invoker_elite', count: 2 },
          { enemyId: 'rift_invoker', count: 2 },
        ],
        isBossWave: false,
        statScale: 1.2,
      },
      {
        waveIndex: 1,
        enemies: [
          { enemyId: 'ironreach_invoker_elite', count: 1 },
          { enemyId: 'rift_invoker', count: 2 },
        ],
        isBossWave: true,
        statScale: 1.45,
      },
    ],
  },
];

const BOSS_BY_ID = new Map(COVENANT_BOSSES.map((boss) => [boss.id, boss]));

export function getCovenantBoss(bossId: string): CovenantBossDefinition | null {
  return BOSS_BY_ID.get(bossId) ?? null;
}

export function getCovenantBossWaves(bossId: string): WaveConfig[] {
  return getCovenantBoss(bossId)?.waves ?? [];
}

/** Deterministic boss pick — rotates by ISO week key hash. */
export function pickBossIdForWeek(weekKey: string): string {
  let hash = 0;
  const seed = `covboss|${weekKey}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % COVENANT_BOSSES.length;
  return COVENANT_BOSSES[index].id;
}
