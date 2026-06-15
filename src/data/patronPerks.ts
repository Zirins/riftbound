// src/data/patronPerks.ts
// Patron Tier thresholds and cosmetic/QoL perks (Section 34.2).

export interface PatronPerkDefinition {
  id: string;
  tier: number;
  label: string;
  description: string;
  /** UI note for Phase 28 — effect wiring deferred unless noted. */
  effectStatus: 'display_only' | 'follow_up';
}

export const PATRON_TIER_THRESHOLDS: readonly number[] = [
  0, 100, 300, 600, 1200, 2500, 5000, 10000, 20000, 40000, 80000,
] as const;

export const PATRON_PERKS: PatronPerkDefinition[] = [
  {
    id: 'patron_default',
    tier: 0,
    label: 'Default',
    description: 'Base account experience.',
    effectStatus: 'display_only',
  },
  {
    id: 'patron_badge_shop_refresh',
    tier: 1,
    label: 'Cosmetic badge + shop free refresh',
    description: 'Patron badge and 1 free Celestial Market refresh per day.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_formation_preset_slot',
    tier: 2,
    label: '+1 formation preset slot',
    description: 'Save one additional formation preset.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_claim_all_ux',
    tier: 3,
    label: 'Claim-all expanded UX',
    description: 'Bulk claim convenience for daily rewards.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_sparkle_toggle',
    tier: 4,
    label: 'Cosmetic sparkle toggle',
    description: 'Optional hub sparkle effect.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_offline_cap_display',
    tier: 5,
    label: 'Offline cap display (18h)',
    description: 'Offline reward cap display shows 18h at same hourly rate.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_team_themes',
    tier: 6,
    label: 'Extra saved team names/themes',
    description: 'Additional formation preset naming themes.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_avatar_frame',
    tier: 7,
    label: 'Exclusive avatar frame',
    description: 'Patron-exclusive profile frame.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_hub_title_plate',
    tier: 8,
    label: 'Hub title plate',
    description: 'Custom title plate on the hub.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_profile_background',
    tier: 9,
    label: 'Premium profile background',
    description: 'Exclusive profile backdrop.',
    effectStatus: 'follow_up',
  },
  {
    id: 'patron_custom_title',
    tier: 10,
    label: 'Custom title: Rift Patron',
    description: 'Unlock the Rift Patron custom title.',
    effectStatus: 'follow_up',
  },
];

export function getPatronPerkByTier(tier: number): PatronPerkDefinition | undefined {
  return PATRON_PERKS.find((perk) => perk.tier === tier);
}
