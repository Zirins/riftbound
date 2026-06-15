// src/systems/MonetizationService.ts
// Monetization abstraction — dev/test purchases only in V2 (Section 32).

import { MONETIZATION_FLAGS } from '../constants/gameConfig';
import {
  ENTITLEMENTS,
  getEntitlement,
  getVoidGemPackage,
} from '../data/monetization';
import type {
  GrantResult,
  PurchaseResult,
  RealmSaveDataV3,
  RestoreResult,
  RewardBundle,
} from '../types';
import { PatronSystem } from './PatronSystem';
import { RewardSystem } from './RewardSystem';

const MONTHLY_CARD_DAYS = 30;

function ensureMonetizationState(save: RealmSaveDataV3): void {
  save.monetizationState ??= {
    foundersPackClaimed: false,
    monthlyCardActiveUntil: null,
    monthlyCardDailyClaimsRemaining: 0,
    growthFundPurchased: false,
    growthFundClaimedMilestones: [],
    testPurchaseHistory: [],
  };
}

function canProcessPurchase(): boolean {
  if (!MonetizationService.isMonetizationEnabled()) return false;
  if (MONETIZATION_FLAGS.ENABLE_PRODUCTION_BILLING) return false;
  return MonetizationService.isTestBillingEnabled() || MONETIZATION_FLAGS.ENABLE_DEV_PURCHASES;
}

function grantVoidGems(save: RealmSaveDataV3, amount: number, source: RewardBundle['source']): GrantResult {
  return RewardSystem.grantRewardBundle(save, {
    source,
    currencies: [{ type: 'void_gem', amount }],
  });
}

function applyPatronPoints(save: RealmSaveDataV3, amount: number): number {
  PatronSystem.addPatronPoints(save, amount);
  PatronSystem.syncPatronTier(save);
  return amount;
}

function recordTestPurchase(save: RealmSaveDataV3, purchaseKey: string): void {
  ensureMonetizationState(save);
  if (!save.monetizationState.testPurchaseHistory.includes(purchaseKey)) {
    save.monetizationState.testPurchaseHistory.push(purchaseKey);
  }
}

function maybeGrantFoundersPack(save: RealmSaveDataV3): void {
  ensureMonetizationState(save);
  if (save.monetizationState.foundersPackClaimed) return;

  const founders = ENTITLEMENTS.find((entry) => entry.type === 'founders_pack');
  if (!founders) return;

  save.monetizationState.foundersPackClaimed = true;
  grantVoidGems(save, founders.voidGemsImmediate, 'iap_purchase');
  applyPatronPoints(save, founders.patronPoints);
  recordTestPurchase(save, founders.id);
}

export { MONETIZATION_FLAGS } from '../constants/gameConfig';

export class MonetizationService {
  static isMonetizationEnabled(): boolean {
    return MONETIZATION_FLAGS.ENABLE_STORE_UI;
  }

  static isTestBillingEnabled(): boolean {
    return MONETIZATION_FLAGS.ENABLE_TEST_BILLING && !MONETIZATION_FLAGS.ENABLE_PRODUCTION_BILLING;
  }

  static async purchaseVoidGemPackage(
    save: RealmSaveDataV3,
    packageId: string,
  ): Promise<PurchaseResult> {
    if (!canProcessPurchase()) {
      return { success: false, reason: 'billing_unavailable', packageId };
    }

    const definition = getVoidGemPackage(packageId);
    if (!definition) {
      return { success: false, reason: 'unknown_package', packageId };
    }

    const grant = grantVoidGems(save, definition.voidGems, 'iap_purchase');
    if (!grant.success) {
      return { success: false, reason: 'grant_failed', packageId };
    }

    applyPatronPoints(save, definition.patronPoints);
    recordTestPurchase(save, definition.id);

    const history = save.monetizationState.testPurchaseHistory;
    if (history.length === 1 && !save.monetizationState.foundersPackClaimed) {
      maybeGrantFoundersPack(save);
    }

    return {
      success: true,
      packageId: definition.id,
      voidGemsGranted: definition.voidGems,
      patronPointsGranted: definition.patronPoints,
    };
  }

  static async purchaseEntitlement(
    save: RealmSaveDataV3,
    entitlementId: string,
  ): Promise<PurchaseResult> {
    if (!canProcessPurchase()) {
      return { success: false, reason: 'billing_unavailable', entitlementId };
    }

    const definition = getEntitlement(entitlementId);
    if (!definition) {
      return { success: false, reason: 'unknown_entitlement', entitlementId };
    }

    ensureMonetizationState(save);

    if (definition.type === 'founders_pack') {
      if (save.monetizationState.foundersPackClaimed) {
        return { success: false, reason: 'already_claimed', entitlementId };
      }
      save.monetizationState.foundersPackClaimed = true;
    }

    if (definition.type === 'monthly_card') {
      const end = new Date();
      end.setDate(end.getDate() + MONTHLY_CARD_DAYS);
      save.monetizationState.monthlyCardActiveUntil = end.toISOString().slice(0, 10);
      save.monetizationState.monthlyCardDailyClaimsRemaining = MONTHLY_CARD_DAYS;
    }

    if (definition.type === 'growth_fund') {
      if (save.monetizationState.growthFundPurchased) {
        return { success: false, reason: 'already_purchased', entitlementId };
      }
      save.monetizationState.growthFundPurchased = true;
    }

    const grant = grantVoidGems(save, definition.voidGemsImmediate, 'iap_purchase');
    if (!grant.success) {
      return { success: false, reason: 'grant_failed', entitlementId };
    }

    applyPatronPoints(save, definition.patronPoints);
    recordTestPurchase(save, definition.id);

    if (
      definition.type !== 'founders_pack'
      && !save.monetizationState.foundersPackClaimed
      && save.monetizationState.testPurchaseHistory.length === 1
    ) {
      maybeGrantFoundersPack(save);
    }

    return {
      success: true,
      entitlementId: definition.id,
      voidGemsGranted: definition.voidGemsImmediate,
      patronPointsGranted: definition.patronPoints,
    };
  }

  static async restorePurchases(save: RealmSaveDataV3): Promise<RestoreResult> {
    if (MONETIZATION_FLAGS.ENABLE_PRODUCTION_BILLING) {
      return {
        success: false,
        reason: 'production_billing_not_implemented',
        restoredEntitlements: [],
      };
    }

    ensureMonetizationState(save);
    const restored: string[] = [];

    if (save.monetizationState.monthlyCardActiveUntil) {
      restored.push('rift_veil_card');
    }
    if (save.monetizationState.growthFundPurchased) {
      restored.push('growth_fund');
    }
    if (save.monetizationState.foundersPackClaimed) {
      restored.push('founders_sigil_pack');
    }

    return {
      success: true,
      restoredEntitlements: restored,
    };
  }

  static devGrantVoidGems(save: RealmSaveDataV3, amount: number): GrantResult {
    if (!MONETIZATION_FLAGS.ENABLE_DEV_PURCHASES) {
      return {
        success: false,
        grantedBundle: { source: 'dev_grant' },
        errors: ['dev_purchases_disabled'],
      };
    }

    return grantVoidGems(save, Math.max(0, Math.floor(amount)), 'dev_grant');
  }
}
