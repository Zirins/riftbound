// src/systems/legacyRewardBundle.ts
// Maps V1.1 legacy reward types to V2 RewardBundle grants.

import type { CurrencyReward, ItemReward, RewardBundle, RewardSource } from '../types';

export type LegacyGrantType = 'gold' | 'crystals' | 'energy' | 'xpFragments';

export function buildLegacyCurrencyBundle(
  source: RewardSource,
  grants: Array<{ type: LegacyGrantType; amount: number }>,
): RewardBundle {
  const currencies: CurrencyReward[] = [];
  const items: ItemReward[] = [];

  for (const grant of grants) {
    if (grant.amount <= 0) continue;

    switch (grant.type) {
      case 'gold':
        currencies.push({ type: 'gold', amount: grant.amount });
        break;
      case 'crystals':
        currencies.push({ type: 'rift_crystal', amount: grant.amount });
        break;
      case 'energy':
        currencies.push({ type: 'energy', amount: grant.amount });
        break;
      case 'xpFragments':
        items.push({ itemId: 'xp_fragment', quantity: grant.amount });
        break;
    }
  }

  return {
    source,
    currencies: currencies.length > 0 ? currencies : undefined,
    items: items.length > 0 ? items : undefined,
  };
}
