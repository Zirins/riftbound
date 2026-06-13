// src/data/stages.ts
// Chapter 1 stage definitions — pure configuration.

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
];

export const CHAPTER_1_STAGE_IDS: string[] = STAGES.map((stage) => stage.id);
