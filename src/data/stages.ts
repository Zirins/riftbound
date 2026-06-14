// src/data/stages.ts
// Campaign stage definitions — Chapters 1–3.

import type { StageData } from '../types';

export const STAGES: StageData[] = [
  {
    id: 'stage_1_1',
    name: 'Stage 1-1: Rift Outskirts',
    chapterId: 'chapter_1',
    energyCost: 4,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_grunt', count: 4 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_grunt', count: 3 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_grunt', count: 2 }], isBossWave: true },
    ],
    rewards: { gold: { min: 400, max: 600 }, crystals: 10, xpFragments: 5 },
    unlockCondition: null,
  },
  {
    id: 'stage_1_2',
    name: 'Stage 1-2: Ember Road',
    chapterId: 'chapter_1',
    energyCost: 5,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_grunt', count: 3 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_grunt', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_specter', count: 3 }, { enemyId: 'rift_invoker', count: 1 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: true },
    ],
    rewards: { gold: { min: 480, max: 720 }, crystals: 12, xpFragments: 6 },
    unlockCondition: 'stage_1_1',
  },
  {
    id: 'stage_1_3',
    name: 'Stage 1-3: Ashfall Crossing',
    chapterId: 'chapter_1',
    energyCost: 5,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_grunt', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_invoker', count: 2 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_ironclad', count: 1 }], isBossWave: true },
    ],
    rewards: { gold: { min: 550, max: 800 }, crystals: 15, xpFragments: 8 },
    unlockCondition: 'stage_1_2',
  },
  {
    id: 'stage_1_4',
    name: 'Stage 1-4: Scorched Vale',
    chapterId: 'chapter_1',
    energyCost: 6,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_grunt', count: 2 }, { enemyId: 'rift_specter', count: 2 }, { enemyId: 'rift_ironclad', count: 1 }, { enemyId: 'rift_invoker', count: 1 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_grunt', count: 3 }, { enemyId: 'rift_invoker', count: 2 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 2 }, { enemyId: 'rift_grunt', count: 2 }, { enemyId: 'rift_specter', count: 1 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_ironclad', count: 2 }], isBossWave: true },
    ],
    rewards: { gold: { min: 700, max: 1000 }, crystals: 18, xpFragments: 10 },
    unlockCondition: 'stage_1_3',
  },
  {
    id: 'stage_1_5',
    name: 'Stage 1-5: Ironwind Pass',
    chapterId: 'chapter_1',
    energyCost: 6,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_invoker', count: 3 }, { enemyId: 'rift_ironclad', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 3 }, { enemyId: 'rift_grunt', count: 2 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: true },
    ],
    rewards: { gold: { min: 850, max: 1150 }, crystals: 21, xpFragments: 12 },
    unlockCondition: 'stage_1_4',
  },
  {
    id: 'stage_1_6',
    name: 'Stage 1-6: Hollow Ridge',
    chapterId: 'chapter_1',
    energyCost: 7,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_grunt', count: 4 }, { enemyId: 'rift_specter', count: 3 }, { enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_specter', count: 4 }, { enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_grunt', count: 3 }, { enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_invoker', count: 3 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 1 }], isBossWave: true },
    ],
    rewards: { gold: { min: 1000, max: 1300 }, crystals: 24, xpFragments: 14 },
    unlockCondition: 'stage_1_5',
  },
  {
    id: 'stage_1_7',
    name: 'Stage 1-7: Warden Approach',
    chapterId: 'chapter_1',
    energyCost: 7,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_invoker', count: 3 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_grunt', count: 4 }, { enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_invoker', count: 2 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_invoker', count: 4 }, { enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_specter', count: 3 }, { enemyId: 'rift_grunt', count: 3 }], isBossWave: false },
      { waveIndex: 3, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: true },
    ],
    rewards: { gold: { min: 1150, max: 1450 }, crystals: 27, xpFragments: 16 },
    unlockCondition: 'stage_1_6',
  },
  {
    id: 'stage_1_8',
    name: "Stage 1-8: The Warden's Gate — CHAPTER BOSS",
    chapterId: 'chapter_1',
    energyCost: 8,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_ironclad', count: 2 }, { enemyId: 'rift_invoker', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_ironclad', count: 3 }, { enemyId: 'rift_specter', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_warden', count: 1 }, { enemyId: 'rift_grunt', count: 4 }], isBossWave: true },
    ],
    rewards: {
      gold: { min: 2000, max: 3000 },
      crystals: 80,
      xpFragments: 30,
      shardDrops: [
        { heroId: 'kael', chance: 0.15 },
        { heroId: 'sura', chance: 0.15 },
      ],
    },
    unlockCondition: 'stage_1_7',
  },
  // ─── Chapter 2: The Hollow Reaches ─────────────────────────────────────────
  {
    id: 'stage_2_1',
    name: 'Stage 2-1: Veil Threshold',
    chapterId: 'chapter_2',
    energyCost: 8,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_phantom', count: 2 }, { enemyId: 'hollow_sentinel', count: 1 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_phantom', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'hollow_sentinel', count: 2 }, { enemyId: 'rift_phantom', count: 2 }], isBossWave: false },
    ],
    rewards: {
      gold: { min: 1200, max: 1600 },
      crystals: 25,
      xpFragments: 12,
      sigilDrop: { chance: 0.08, rarity: 'common' },
    },
    unlockCondition: 'stage_1_8',
  },
  {
    id: 'stage_2_2',
    name: 'Stage 2-2: Mirror Shallows',
    chapterId: 'chapter_2',
    energyCost: 8,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_phantom', count: 3 }, { enemyId: 'hollow_sentinel', count: 1 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'hollow_sentinel', count: 2 }, { enemyId: 'rift_phantom', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_phantom', count: 4 }], isBossWave: false, statScale: 1.05 },
    ],
    rewards: {
      gold: { min: 1350, max: 1750 },
      crystals: 28,
      xpFragments: 13,
      sigilDrop: { chance: 0.08, rarity: 'common' },
    },
    unlockCondition: 'stage_2_1',
  },
  {
    id: 'stage_2_3',
    name: 'Stage 2-3: Hollow Crossing',
    chapterId: 'chapter_2',
    energyCost: 8,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'hollow_sentinel', count: 2 }, { enemyId: 'rift_phantom', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_phantom', count: 3 }, { enemyId: 'hollow_sentinel', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'hollow_sentinel', count: 3 }, { enemyId: 'rift_phantom', count: 3 }], isBossWave: false, statScale: 1.08 },
    ],
    rewards: {
      gold: { min: 1500, max: 1900 },
      crystals: 32,
      xpFragments: 14,
      sigilDrop: { chance: 0.08, rarity: 'common' },
    },
    unlockCondition: 'stage_2_2',
  },
  {
    id: 'stage_2_4',
    name: 'Stage 2-4: Glasswind Pass',
    chapterId: 'chapter_2',
    energyCost: 10,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_phantom', count: 4 }, { enemyId: 'hollow_sentinel', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'hollow_sentinel', count: 3 }, { enemyId: 'rift_phantom', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_phantom', count: 4 }, { enemyId: 'hollow_sentinel', count: 3 }], isBossWave: false, statScale: 1.1 },
    ],
    rewards: {
      gold: { min: 1700, max: 2200 },
      crystals: 36,
      xpFragments: 16,
      sigilDrop: { chance: 0.12, rarity: 'common' },
    },
    unlockCondition: 'stage_2_3',
  },
  {
    id: 'stage_2_5',
    name: 'Stage 2-5: Echoing Span',
    chapterId: 'chapter_2',
    energyCost: 10,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'hollow_sentinel', count: 3 }, { enemyId: 'rift_phantom', count: 3 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_phantom', count: 5 }, { enemyId: 'hollow_sentinel', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'hollow_sentinel', count: 4 }, { enemyId: 'rift_phantom', count: 3 }], isBossWave: false, statScale: 1.12 },
    ],
    rewards: {
      gold: { min: 1850, max: 2350 },
      crystals: 40,
      xpFragments: 17,
      sigilDrop: { chance: 0.12, rarity: 'common' },
    },
    unlockCondition: 'stage_2_4',
  },
  {
    id: 'stage_2_6',
    name: 'Stage 2-6: Phantom Warren',
    chapterId: 'chapter_2',
    energyCost: 10,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_phantom', count: 5 }, { enemyId: 'hollow_sentinel', count: 3 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'hollow_sentinel', count: 4 }, { enemyId: 'rift_phantom', count: 4 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'rift_phantom', count: 6 }, { enemyId: 'hollow_sentinel', count: 3 }], isBossWave: false, statScale: 1.15 },
    ],
    rewards: {
      gold: { min: 2000, max: 2500 },
      crystals: 44,
      xpFragments: 18,
      sigilDrop: { chance: 0.12, rarity: 'common' },
    },
    unlockCondition: 'stage_2_5',
  },
  {
    id: 'stage_2_7',
    name: 'Stage 2-7: Warden Approach',
    chapterId: 'chapter_2',
    energyCost: 12,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'hollow_sentinel', count: 4 }, { enemyId: 'rift_phantom', count: 4 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'rift_phantom', count: 5 }, { enemyId: 'hollow_sentinel', count: 4 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'hollow_sentinel', count: 5 }, { enemyId: 'rift_phantom', count: 5 }], isBossWave: false, statScale: 1.18 },
    ],
    rewards: {
      gold: { min: 2200, max: 2800 },
      crystals: 50,
      xpFragments: 20,
      sigilDrop: { chance: 0.15, rarity: 'uncommon' },
    },
    unlockCondition: 'stage_2_6',
  },
  {
    id: 'stage_2_8',
    name: "Stage 2-8: Hollow Warden's Gate — CHAPTER BOSS",
    chapterId: 'chapter_2',
    energyCost: 12,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'rift_phantom', count: 4 }, { enemyId: 'hollow_sentinel', count: 3 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'hollow_sentinel', count: 4 }, { enemyId: 'rift_phantom', count: 4 }], isBossWave: false, statScale: 1.1 },
      { waveIndex: 2, enemies: [{ enemyId: 'hollow_warden', count: 1 }, { enemyId: 'hollow_sentinel', count: 2 }], isBossWave: true },
    ],
    rewards: {
      gold: { min: 3500, max: 4500 },
      crystals: 90,
      xpFragments: 35,
      sigilDrop: { chance: 0.15, rarity: 'uncommon' },
    },
    unlockCondition: 'stage_2_7',
  },
  // ─── Chapter 3: Ironreach Depths ───────────────────────────────────────────
  {
    id: 'stage_3_1',
    name: 'Stage 3-1: Ironreach Mouth',
    chapterId: 'chapter_3',
    energyCost: 12,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 2 }, { enemyId: 'ironreach_invoker_elite', count: 1 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 2 }, { enemyId: 'ironreach_crusher', count: 1 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_crusher', count: 2 }, { enemyId: 'ironreach_invoker_elite', count: 2 }], isBossWave: false },
    ],
    rewards: {
      gold: { min: 2400, max: 3000 },
      crystals: 45,
      xpFragments: 18,
      sigilDrop: { chance: 0.12, rarity: 'uncommon' },
    },
    unlockCondition: 'stage_2_8',
  },
  {
    id: 'stage_3_2',
    name: 'Stage 3-2: Rusted Galleries',
    chapterId: 'chapter_3',
    energyCost: 12,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 2 }, { enemyId: 'ironreach_invoker_elite', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 3 }, { enemyId: 'ironreach_crusher', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_crusher', count: 3 }, { enemyId: 'ironreach_invoker_elite', count: 2 }], isBossWave: false, statScale: 1.05 },
    ],
    rewards: {
      gold: { min: 2600, max: 3200 },
      crystals: 50,
      xpFragments: 19,
      sigilDrop: { chance: 0.12, rarity: 'uncommon' },
    },
    unlockCondition: 'stage_3_1',
  },
  {
    id: 'stage_3_3',
    name: 'Stage 3-3: Ember Foundry',
    chapterId: 'chapter_3',
    energyCost: 12,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 3 }, { enemyId: 'ironreach_crusher', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_crusher', count: 3 }, { enemyId: 'ironreach_invoker_elite', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 4 }, { enemyId: 'ironreach_crusher', count: 3 }], isBossWave: false, statScale: 1.08 },
    ],
    rewards: {
      gold: { min: 2800, max: 3400 },
      crystals: 55,
      xpFragments: 20,
      sigilDrop: { chance: 0.12, rarity: 'uncommon' },
    },
    unlockCondition: 'stage_3_2',
  },
  {
    id: 'stage_3_4',
    name: 'Stage 3-4: Crusher Hall',
    chapterId: 'chapter_3',
    energyCost: 14,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 3 }, { enemyId: 'ironreach_invoker_elite', count: 2 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 4 }, { enemyId: 'ironreach_crusher', count: 2 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_crusher', count: 4 }, { enemyId: 'ironreach_invoker_elite', count: 3 }], isBossWave: false, statScale: 1.1 },
    ],
    rewards: {
      gold: { min: 3000, max: 3700 },
      crystals: 60,
      xpFragments: 22,
      sigilDrop: { chance: 0.10, rarity: 'rare' },
    },
    unlockCondition: 'stage_3_3',
  },
  {
    id: 'stage_3_5',
    name: 'Stage 3-5: Molten Span',
    chapterId: 'chapter_3',
    energyCost: 14,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 4 }, { enemyId: 'ironreach_crusher', count: 3 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_crusher', count: 4 }, { enemyId: 'ironreach_invoker_elite', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 5 }, { enemyId: 'ironreach_crusher', count: 3 }], isBossWave: false, statScale: 1.12 },
    ],
    rewards: {
      gold: { min: 3200, max: 3900 },
      crystals: 65,
      xpFragments: 23,
      sigilDrop: { chance: 0.10, rarity: 'rare' },
    },
    unlockCondition: 'stage_3_4',
  },
  {
    id: 'stage_3_6',
    name: 'Stage 3-6: Ironroot Vault',
    chapterId: 'chapter_3',
    energyCost: 14,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 4 }, { enemyId: 'ironreach_invoker_elite', count: 4 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 5 }, { enemyId: 'ironreach_crusher', count: 3 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_crusher', count: 5 }, { enemyId: 'ironreach_invoker_elite', count: 4 }], isBossWave: false, statScale: 1.15 },
    ],
    rewards: {
      gold: { min: 3400, max: 4100 },
      crystals: 70,
      xpFragments: 24,
      sigilDrop: { chance: 0.10, rarity: 'rare' },
    },
    unlockCondition: 'stage_3_5',
  },
  {
    id: 'stage_3_7',
    name: 'Stage 3-7: Titan Approach',
    chapterId: 'chapter_3',
    energyCost: 16,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 4 }, { enemyId: 'ironreach_invoker_elite', count: 4 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_invoker_elite', count: 5 }, { enemyId: 'ironreach_crusher', count: 4 }], isBossWave: false },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_crusher', count: 5 }, { enemyId: 'ironreach_invoker_elite', count: 5 }], isBossWave: false, statScale: 1.18 },
    ],
    rewards: {
      gold: { min: 3600, max: 4400 },
      crystals: 80,
      xpFragments: 26,
      sigilDrop: { chance: 0.15, rarity: 'rare' },
    },
    unlockCondition: 'stage_3_6',
  },
  {
    id: 'stage_3_8',
    name: "Stage 3-8: Ironreach Titan — CHAPTER BOSS",
    chapterId: 'chapter_3',
    energyCost: 16,
    waves: [
      { waveIndex: 0, enemies: [{ enemyId: 'ironreach_crusher', count: 3 }, { enemyId: 'ironreach_invoker_elite', count: 3 }], isBossWave: false },
      { waveIndex: 1, enemies: [{ enemyId: 'ironreach_crusher', count: 4 }, { enemyId: 'ironreach_invoker_elite', count: 3 }], isBossWave: false, statScale: 1.1 },
      { waveIndex: 2, enemies: [{ enemyId: 'ironreach_titan', count: 1 }, { enemyId: 'ironreach_crusher', count: 2 }], isBossWave: true },
    ],
    rewards: {
      gold: { min: 5000, max: 6500 },
      crystals: 120,
      xpFragments: 40,
      sigilDrop: { chance: 0.15, rarity: 'rare' },
      firstClearItems: [{ itemId: 'awakening_crystal', quantity: 5 }],
    },
    unlockCondition: 'stage_3_7',
  },
];

export const CHAPTER_1_STAGE_IDS: string[] = STAGES
  .filter((stage) => stage.chapterId === 'chapter_1')
  .map((stage) => stage.id);

export const CHAPTER_2_STAGE_IDS: string[] = STAGES
  .filter((stage) => stage.chapterId === 'chapter_2')
  .map((stage) => stage.id);

export const CHAPTER_3_STAGE_IDS: string[] = STAGES
  .filter((stage) => stage.chapterId === 'chapter_3')
  .map((stage) => stage.id);

export const ALL_CAMPAIGN_STAGE_IDS: string[] = STAGES.map((stage) => stage.id);
