// src/data/monetization.ts
// Void Gem packages and test entitlements (Section 32 / Phase 28).

export interface VoidGemPackageDefinition {
  id: string;
  name: string;
  description: string;
  voidGems: number;
  /** Patron points awarded — equals void gems granted (lifetime spend tracker, Section 34). */
  patronPoints: number;
  testPriceLabel: string;
}

export interface EntitlementDefinition {
  id: string;
  name: string;
  description: string;
  voidGemsImmediate: number;
  patronPoints: number;
  testPriceLabel: string;
  type: 'monthly_card' | 'founders_pack' | 'growth_fund';
}

export const VOID_GEM_PACKAGES: VoidGemPackageDefinition[] = [
  {
    id: 'void_gem_pouch',
    name: 'Rift Pouch',
    description: 'A small bundle of Void Gems.',
    voidGems: 60,
    patronPoints: 60,
    testPriceLabel: '$0.99',
  },
  {
    id: 'void_gem_satchel',
    name: 'Rift Satchel',
    description: 'A solid Void Gem bundle.',
    voidGems: 300,
    patronPoints: 300,
    testPriceLabel: '$4.99',
  },
  {
    id: 'void_gem_coffer',
    name: 'Rift Coffer',
    description: 'A generous Void Gem stash.',
    voidGems: 980,
    patronPoints: 980,
    testPriceLabel: '$14.99',
  },
  {
    id: 'void_gem_vault',
    name: 'Rift Vault',
    description: 'The largest Void Gem bundle.',
    voidGems: 1980,
    patronPoints: 1980,
    testPriceLabel: '$29.99',
  },
];

export const ENTITLEMENTS: EntitlementDefinition[] = [
  {
    id: 'rift_veil_card',
    name: 'Rift Veil Card',
    description: '300 Void Gems now + 30/day for 30 days (test SKU).',
    voidGemsImmediate: 300,
    patronPoints: 300,
    testPriceLabel: '$4.99/mo',
    type: 'monthly_card',
  },
  {
    id: 'founders_sigil_pack',
    name: "Founder's Sigil Pack",
    description: 'One-time bonus after first purchase (test SKU).',
    voidGemsImmediate: 200,
    patronPoints: 200,
    testPriceLabel: 'First purchase',
    type: 'founders_pack',
  },
];

const PACKAGES_BY_ID = new Map(VOID_GEM_PACKAGES.map((pkg) => [pkg.id, pkg]));
const ENTITLEMENTS_BY_ID = new Map(ENTITLEMENTS.map((entry) => [entry.id, entry]));

export function getVoidGemPackage(packageId: string): VoidGemPackageDefinition | undefined {
  return PACKAGES_BY_ID.get(packageId);
}

export function getEntitlement(entitlementId: string): EntitlementDefinition | undefined {
  return ENTITLEMENTS_BY_ID.get(entitlementId);
}
