// src/data/npcCovenantMembers.ts
// Seeded NPC members for the simulated join-Covenant flow (Section 25.1).

import type { CovenantMember } from '../types';

export interface SimulatedCovenantPreset {
  covId: string;
  covName: string;
  covLevel: number;
  covXP: number;
}

/** Pre-seeded NPC Covenant the player can join in V2. */
export const SIMULATED_COVENANT_PRESET: SimulatedCovenantPreset = {
  covId: 'cov_sim_moonwake',
  covName: 'Moonwake Covenant',
  covLevel: 4,
  covXP: 450,
};

export const NPC_COVENANT_MEMBERS: CovenantMember[] = [
  {
    id: 'npc_cov_lyra',
    name: 'Lyra Moonwake',
    role: 'npc',
    resonancePower: 18_420,
    lastActiveText: '2h ago',
    weeklyContribution: 320,
  },
  {
    id: 'npc_cov_darian',
    name: 'Darian Holt',
    role: 'npc',
    resonancePower: 16_880,
    lastActiveText: '45m ago',
    weeklyContribution: 280,
  },
  {
    id: 'npc_cov_sera',
    name: 'Sera Vex',
    role: 'npc',
    resonancePower: 15_240,
    lastActiveText: '5h ago',
    weeklyContribution: 210,
  },
  {
    id: 'npc_cov_korin',
    name: 'Korin Ash',
    role: 'npc',
    resonancePower: 14_600,
    lastActiveText: '1d ago',
    weeklyContribution: 190,
  },
  {
    id: 'npc_cov_mira',
    name: 'Mira Sol',
    role: 'npc',
    resonancePower: 13_950,
    lastActiveText: '3h ago',
    weeklyContribution: 175,
  },
  {
    id: 'npc_cov_thane',
    name: 'Thane Rook',
    role: 'npc',
    resonancePower: 12_800,
    lastActiveText: '8h ago',
    weeklyContribution: 150,
  },
  {
    id: 'npc_cov_elin',
    name: 'Elin Voss',
    role: 'npc',
    resonancePower: 11_420,
    lastActiveText: '12h ago',
    weeklyContribution: 130,
  },
  {
    id: 'npc_cov_pax',
    name: 'Pax Orin',
    role: 'npc',
    resonancePower: 10_600,
    lastActiveText: '1d ago',
    weeklyContribution: 110,
  },
  {
    id: 'npc_cov_nyx',
    name: 'Nyx Calder',
    role: 'npc',
    resonancePower: 9_880,
    lastActiveText: '2d ago',
    weeklyContribution: 95,
  },
  {
    id: 'npc_cov_riven',
    name: 'Riven Cole',
    role: 'npc',
    resonancePower: 8_740,
    lastActiveText: '6h ago',
    weeklyContribution: 80,
  },
  {
    id: 'npc_cov_joss',
    name: 'Joss Pike',
    role: 'npc',
    resonancePower: 7_920,
    lastActiveText: '18h ago',
    weeklyContribution: 65,
  },
  {
    id: 'npc_cov_uma',
    name: 'Uma Flint',
    role: 'npc',
    resonancePower: 6_540,
    lastActiveText: '3d ago',
    weeklyContribution: 40,
  },
  {
    id: 'npc_cov_cade',
    name: 'Cade Wren',
    role: 'npc',
    resonancePower: 5_880,
    lastActiveText: '4h ago',
    weeklyContribution: 55,
  },
  {
    id: 'npc_cov_iora',
    name: 'Iora Penn',
    role: 'npc',
    resonancePower: 4_960,
    lastActiveText: '2d ago',
    weeklyContribution: 25,
  },
];
