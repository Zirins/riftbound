// src/data/arenaOpponents.ts
// ~20 named Asterra NPC opponents for Resonance Arena stand-in battles.

export interface ArenaOpponent {
  id: string;
  displayName: string;
  rankTier: string;
  rp: number;
  heroIds: string[];
}

export const ARENA_OPPONENTS: ArenaOpponent[] = [
  {
    id: 'npc_kaelric',
    displayName: 'Squire Kaelric',
    rankTier: 'rift_initiate',
    rp: 4_200,
    heroIds: ['kael', 'sura', 'mira', 'nyra'],
  },
  {
    id: 'npc_elira',
    displayName: 'Initiate Elira',
    rankTier: 'rift_initiate',
    rp: 5_100,
    heroIds: ['mira', 'nyra', 'kael', 'sura'],
  },
  {
    id: 'npc_dorn',
    displayName: 'Cadet Dorn',
    rankTier: 'rift_initiate',
    rp: 6_800,
    heroIds: ['sura', 'kael', 'nyra', 'mira'],
  },
  {
    id: 'npc_seya',
    displayName: 'Ironfold Seya',
    rankTier: 'rift_initiate',
    rp: 8_400,
    heroIds: ['kael', 'thane_ironroot', 'mira', 'nyra'],
  },
  {
    id: 'npc_vael',
    displayName: 'Commander Vael',
    rankTier: 'rift_adept',
    rp: 9_800,
    heroIds: ['kael', 'sura', 'mira', 'nyra'],
  },
  {
    id: 'npc_drun',
    displayName: 'Ashcaller Drun',
    rankTier: 'rift_adept',
    rp: 11_200,
    heroIds: ['sura', 'ren_vale', 'mira', 'nyra'],
  },
  {
    id: 'npc_lysara',
    displayName: 'Veilguard Lysara',
    rankTier: 'rift_adept',
    rp: 12_600,
    heroIds: ['mira', 'caira_dawnveil', 'kael', 'nyra'],
  },
  {
    id: 'npc_torven',
    displayName: 'Stormlance Torven',
    rankTier: 'rift_adept',
    rp: 14_800,
    heroIds: ['nyra', 'marek_stormreign', 'sura', 'kael'],
  },
  {
    id: 'npc_hask',
    displayName: 'Warden Hask',
    rankTier: 'rift_sentinel',
    rp: 16_500,
    heroIds: ['thane_ironroot', 'kael', 'sura', 'mira'],
  },
  {
    id: 'npc_veylin',
    displayName: 'Hollowglass Veylin',
    rankTier: 'rift_sentinel',
    rp: 18_200,
    heroIds: ['veyra_hollowglass', 'nyra', 'ren_vale', 'mira'],
  },
  {
    id: 'npc_solara',
    displayName: 'Arclight Solara',
    rankTier: 'rift_sentinel',
    rp: 20_400,
    heroIds: ['solenne_arclight', 'sura', 'caira_dawnveil', 'nyra'],
  },
  {
    id: 'npc_brann',
    displayName: 'Ironroot Brann',
    rankTier: 'rift_sentinel',
    rp: 22_800,
    heroIds: ['thane_ironroot', 'kael', 'marek_stormreign', 'mira'],
  },
  {
    id: 'npc_caelis',
    displayName: 'Dawnveil Caelis',
    rankTier: 'rift_vanguard',
    rp: 25_600,
    heroIds: ['caira_dawnveil', 'mira', 'solenne_arclight', 'nyra'],
  },
  {
    id: 'npc_renfeld',
    displayName: 'Vale Renfeld',
    rankTier: 'rift_vanguard',
    rp: 28_900,
    heroIds: ['ren_vale', 'sura', 'veyra_hollowglass', 'kael'],
  },
  {
    id: 'npc_marekson',
    displayName: 'Stormreign Marekson',
    rankTier: 'rift_vanguard',
    rp: 32_100,
    heroIds: ['marek_stormreign', 'nyra', 'thane_ironroot', 'sura'],
  },
  {
    id: 'npc_iora',
    displayName: 'Sentinel Iora',
    rankTier: 'rift_vanguard',
    rp: 35_400,
    heroIds: ['kael', 'solenne_arclight', 'caira_dawnveil', 'thane_ironroot'],
  },
  {
    id: 'npc_ashwyn',
    displayName: 'Ascendant Ashwyn',
    rankTier: 'rift_ascendant',
    rp: 39_800,
    heroIds: ['ren_vale', 'veyra_hollowglass', 'marek_stormreign', 'solenne_arclight'],
  },
  {
    id: 'npc_thalric',
    displayName: 'Thalric the Bound',
    rankTier: 'rift_ascendant',
    rp: 44_200,
    heroIds: ['thane_ironroot', 'kael', 'caira_dawnveil', 'marek_stormreign'],
  },
  {
    id: 'npc_elyndra',
    displayName: 'Paragon Elyndra',
    rankTier: 'rift_paragon',
    rp: 48_600,
    heroIds: ['solenne_arclight', 'veyra_hollowglass', 'caira_dawnveil', 'ren_vale'],
  },
  {
    id: 'npc_korvath',
    displayName: 'Korvath of the Rift',
    rankTier: 'rift_paragon',
    rp: 52_000,
    heroIds: ['marek_stormreign', 'thane_ironroot', 'ren_vale', 'solenne_arclight'],
  },
];
