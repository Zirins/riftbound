// src/data/weeklyTasks.ts
// Weekly mission definitions (Section 24.2).

import { AWAKENING_CRYSTAL_ITEM_ID } from './awakeningData';
import type { RewardBundle } from '../types';

export type WeeklyMissionId =
  | 'weekly_campaign_regular'
  | 'weekly_arena_competitor'
  | 'weekly_disciplined_routine'
  | 'weekly_sigil_forger'
  | 'weekly_covenant_supporter';

export type WeeklyMissionAvailabilityStatus = 'active' | 'locked';

export interface WeeklyMissionDefinition {
  id: WeeklyMissionId;
  name: string;
  description: string;
  requiredProgress: number;
  reward: RewardBundle;
  availability: WeeklyMissionAvailabilityStatus;
  lockReason?: string;
}

export const WEEKLY_MISSIONS: WeeklyMissionDefinition[] = [
  {
    id: 'weekly_campaign_regular',
    name: 'Campaign Regular',
    description: 'Clear or sweep 15 campaign stages',
    requiredProgress: 15,
    availability: 'active',
    reward: {
      source: 'weekly_task',
      currencies: [{ type: 'rift_crystal', amount: 100 }],
    },
  },
  {
    id: 'weekly_arena_competitor',
    name: 'Arena Competitor',
    description: 'Win 10 Arena matches',
    requiredProgress: 10,
    availability: 'active',
    reward: {
      source: 'weekly_task',
      currencies: [
        { type: 'rift_crystal', amount: 50 },
        { type: 'gold', amount: 500 },
      ],
    },
  },
  {
    id: 'weekly_disciplined_routine',
    name: 'Disciplined Routine',
    description: 'Complete all daily tasks on 3 different days',
    requiredProgress: 3,
    availability: 'active',
    reward: {
      source: 'weekly_task',
      currencies: [{ type: 'rift_crystal', amount: 80 }],
    },
  },
  {
    id: 'weekly_sigil_forger',
    name: 'Sigil Forger',
    description: 'Level up or upgrade a Sigil 5 times',
    requiredProgress: 5,
    availability: 'active',
    reward: {
      source: 'weekly_task',
      items: [{ itemId: AWAKENING_CRYSTAL_ITEM_ID, quantity: 1 }],
    },
  },
  {
    id: 'weekly_covenant_supporter',
    name: 'Sect Supporter',
    description: 'Contribute to your Sect 5 times',
    requiredProgress: 5,
    availability: 'active',
    reward: {
      source: 'weekly_task',
      currencies: [
        { type: 'rift_crystal', amount: 100 },
        { type: 'covenant_coin', amount: 20 },
      ],
    },
  },
];

const MISSIONS_BY_ID = new Map(WEEKLY_MISSIONS.map((mission) => [mission.id, mission]));

export function getWeeklyMissionDefinition(id: string): WeeklyMissionDefinition | undefined {
  return MISSIONS_BY_ID.get(id as WeeklyMissionId);
}

export function isWeeklyMissionActive(missionId: string): boolean {
  const definition = getWeeklyMissionDefinition(missionId);
  return definition?.availability === 'active';
}
