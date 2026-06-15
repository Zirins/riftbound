// src/data/covenantLevels.ts
// Sect level XP thresholds and tech unlocks (Section 25.5).

export const COVENANT_LEVEL_XP_THRESHOLDS = [
  0,
  100,
  250,
  450,
  700,
  1000,
  1350,
  1750,
  2200,
  2700,
] as const;

export const MAX_COVENANT_LEVEL = COVENANT_LEVEL_XP_THRESHOLDS.length;

export interface CovenantTechDefinition {
  level: number;
  label: string;
  /** Combat/economy modifiers — empty for shop/cosmetic-only unlocks. */
  combatModifiers?: {
    hpPercent?: number;
    attackPercent?: number;
    energyRegenPercent?: number;
    covenantCoinGainPercent?: number;
    campaignGoldPercent?: number;
  };
}

export const COVENANT_TECH_UNLOCKS: CovenantTechDefinition[] = [
  { level: 1, label: 'None' },
  { level: 2, label: 'All heroes HP +2%', combatModifiers: { hpPercent: 0.02 } },
  { level: 3, label: 'Sigil Dust weekly cap +1' },
  { level: 4, label: 'All heroes ATK +2%', combatModifiers: { attackPercent: 0.02 } },
  { level: 5, label: 'Boss reward cache improved (Phase 23)' },
  { level: 6, label: 'Energy regen +5%', combatModifiers: { energyRegenPercent: 0.05 } },
  { level: 7, label: 'Sect Coin gain +5%', combatModifiers: { covenantCoinGainPercent: 0.05 } },
  { level: 8, label: 'Campaign Gold +5%', combatModifiers: { campaignGoldPercent: 0.05 } },
  { level: 9, label: 'Sigil Dust weekly cap +1 (stacking)' },
  { level: 10, label: 'Cosmetic Sect banner frame' },
];

export function computeCovenantLevelFromXp(xp: number): number {
  let level = 1;
  for (let index = 1; index < COVENANT_LEVEL_XP_THRESHOLDS.length; index += 1) {
    if (xp >= COVENANT_LEVEL_XP_THRESHOLDS[index]) {
      level = index + 1;
    }
  }
  return level;
}

export function getCovenantLevelProgress(xp: number, level: number): {
  currentInLevel: number;
  requiredForNext: number;
  isMaxLevel: boolean;
} {
  if (level >= MAX_COVENANT_LEVEL) {
    return { currentInLevel: 0, requiredForNext: 0, isMaxLevel: true };
  }

  const floorXp = COVENANT_LEVEL_XP_THRESHOLDS[level - 1];
  const nextXp = COVENANT_LEVEL_XP_THRESHOLDS[level];
  return {
    currentInLevel: xp - floorXp,
    requiredForNext: nextXp - floorXp,
    isMaxLevel: false,
  };
}
