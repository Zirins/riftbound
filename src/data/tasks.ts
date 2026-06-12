// src/data/tasks.ts
// Daily task definitions — pure configuration.

import type { CurrencyType } from '../systems/EconomySystem';

export interface TaskDefinition {
  id: string;
  description: string;
  actionType: string;
  requiredProgress: number;
  reward: { type: CurrencyType; amount: number };
}

export const DAILY_TASKS: TaskDefinition[] = [
  {
    id: 'task_complete_stages',
    description: 'Complete 3 Campaign stages',
    actionType: 'complete_stage',
    requiredProgress: 3,
    reward: { type: 'crystals', amount: 20 },
  },
  {
    id: 'task_level_hero',
    description: 'Level up 1 hero',
    actionType: 'level_hero',
    requiredProgress: 1,
    reward: { type: 'gold', amount: 500 },
  },
  {
    id: 'task_perform_summon',
    description: 'Perform 1 summon',
    actionType: 'summon',
    requiredProgress: 1,
    reward: { type: 'crystals', amount: 15 },
  },
  {
    id: 'task_visit_shop',
    description: 'Visit the Celestial Market',
    actionType: 'visit_shop',
    requiredProgress: 1,
    reward: { type: 'gold', amount: 300 },
  },
];
