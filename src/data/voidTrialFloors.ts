// src/data/voidTrialFloors.ts
// Void Trial floor wave configs — 20 floors scaling Ch1–3 enemies (Section 21).

import type { WaveConfig } from '../types';

export interface VoidTrialFloorDefinition {
  floorNumber: number;
  name: string;
  waves: WaveConfig[];
}

const MILESTONE_FLOORS = [1, 5, 10, 15, 20] as const;
export type VoidTrialMilestoneFloor = (typeof MILESTONE_FLOORS)[number];

export function isVoidTrialMilestoneFloor(floor: number): floor is VoidTrialMilestoneFloor {
  return (MILESTONE_FLOORS as readonly number[]).includes(floor);
}

function statScaleForFloor(floor: number): number {
  return 1 + (floor - 1) * 0.045;
}

function buildWaves(floor: number): WaveConfig[] {
  const scale = statScaleForFloor(floor);

  if (floor <= 3) {
    return [{
      waveIndex: 0,
      enemies: [
        { enemyId: 'rift_grunt', count: 2 + floor },
        { enemyId: 'rift_specter', count: 1 + Math.floor(floor / 2) },
      ],
      isBossWave: false,
      statScale: scale,
    }];
  }

  if (floor <= 6) {
    return [{
      waveIndex: 0,
      enemies: [
        { enemyId: 'rift_grunt', count: 3 },
        { enemyId: 'rift_specter', count: 2 },
        { enemyId: 'rift_ironclad', count: 1 + Math.floor(floor / 3) },
      ],
      isBossWave: false,
      statScale: scale,
    }];
  }

  if (floor <= 10) {
    const waves: WaveConfig[] = [{
      waveIndex: 0,
      enemies: [
        { enemyId: 'rift_phantom', count: 2 + Math.floor(floor / 4) },
        { enemyId: 'hollow_sentinel', count: 1 + Math.floor(floor / 5) },
      ],
      isBossWave: false,
      statScale: scale,
    }];
    if (floor >= 9) {
      waves.push({
        waveIndex: 1,
        enemies: [
          { enemyId: 'rift_phantom', count: 3 },
          { enemyId: 'hollow_sentinel', count: 2 },
        ],
        isBossWave: false,
        statScale: scale * 1.05,
      });
    }
    return waves;
  }

  if (floor <= 14) {
    return [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'hollow_sentinel', count: 3 },
          { enemyId: 'hollow_warden', count: 1 },
        ],
        isBossWave: false,
        statScale: scale,
      },
      {
        waveIndex: 1,
        enemies: [
          { enemyId: 'ironreach_crusher', count: 1 + Math.floor(floor / 12) },
          { enemyId: 'rift_phantom', count: 2 },
        ],
        isBossWave: false,
        statScale: scale * 1.08,
      },
    ];
  }

  if (floor <= 19) {
    return [
      {
        waveIndex: 0,
        enemies: [
          { enemyId: 'ironreach_crusher', count: 2 },
          { enemyId: 'ironreach_invoker_elite', count: 1 },
        ],
        isBossWave: false,
        statScale: scale,
      },
      {
        waveIndex: 1,
        enemies: [
          { enemyId: 'hollow_warden', count: 1 },
          { enemyId: 'ironreach_invoker_elite', count: 2 },
          { enemyId: 'hollow_sentinel', count: 2 },
        ],
        isBossWave: false,
        statScale: scale * 1.1,
      },
    ];
  }

  return [
    {
      waveIndex: 0,
      enemies: [
        { enemyId: 'ironreach_crusher', count: 2 },
        { enemyId: 'ironreach_invoker_elite', count: 2 },
      ],
      isBossWave: false,
      statScale: scale,
    },
    {
      waveIndex: 1,
      enemies: [{ enemyId: 'ironreach_titan', count: 1 }],
      isBossWave: true,
      statScale: scale * 1.15,
    },
  ];
}

function buildFloorDefinition(floor: number): VoidTrialFloorDefinition {
  return {
    floorNumber: floor,
    name: `Void Floor ${floor}`,
    waves: buildWaves(floor),
  };
}

export const VOID_TRIAL_FLOORS: VoidTrialFloorDefinition[] = Array.from(
  { length: 20 },
  (_, index) => buildFloorDefinition(index + 1),
);

const FLOORS_BY_NUMBER = new Map(
  VOID_TRIAL_FLOORS.map((floor) => [floor.floorNumber, floor]),
);

export function getVoidTrialFloor(floorNumber: number): VoidTrialFloorDefinition | undefined {
  return FLOORS_BY_NUMBER.get(floorNumber);
}

export function getVoidTrialFloorWaves(floorNumber: number): WaveConfig[] {
  return getVoidTrialFloor(floorNumber)?.waves ?? [];
}
