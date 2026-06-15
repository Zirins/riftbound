// src/data/covenantContribution.ts
// Daily contribution costs and rewards (Section 25.4).

export const COVENANT_CONTRIBUTION = {
  GOLD_COST: 5_000,
  GOLD_COINS: 10,
  GOLD_XP: 10,
  CRYSTAL_COST: 50,
  CRYSTAL_COINS: 15,
  CRYSTAL_XP: 10,
} as const;

/** Bit flags stored in CovenantState.personalContributionToday. */
export const CONTRIBUTION_FLAG_GOLD = 1;
export const CONTRIBUTION_FLAG_CRYSTAL = 2;
