// src/systems/BondSystem.ts
// Resonance Bond computation and global stat modifiers (Section 16.4).

import { BONDS } from '../constants/gameConfig';
import {
  CLASS_IDS,
  CLASS_LABELS,
  FACTION_IDS,
  formatModifierSummary,
  getClassBondId,
  getClassTierModifier,
  getCollectionBondId,
  getCollectionTierModifier,
  getFactionBondId,
  getFactionLabel,
  getFactionTierModifier,
  getHighestTierIndex,
  mergeGlobalModifiers,
  PAIR_BOND_DEFINITIONS,
} from '../data/bonds';
import { HEROES_DATA } from '../data/heroes';
import type {
  ActiveBond,
  GlobalStatModifiers,
  HeroClass,
  HeroData,
  HeroFaction,
  HeroStats,
  RealmSaveDataV3,
} from '../types';
import { SigilSystem } from './SigilSystem';

export class BondSystem {
  static computeActiveBonds(save: RealmSaveDataV3): ActiveBond[] {
    return BondSystem.buildBondCatalog(save).filter((bond) => bond.isActive);
  }

  static computeGlobalModifiers(save: RealmSaveDataV3): GlobalStatModifiers {
    const ownedHeroes = BondSystem.getOwnedHeroData(save);
    let modifiers: GlobalStatModifiers = {};

    for (const faction of FACTION_IDS) {
      const count = BondSystem.countHeroesByFaction(ownedHeroes, faction);
      const tierIndex = getHighestTierIndex(count, BONDS.FACTION_THRESHOLDS);
      modifiers = mergeGlobalModifiers(modifiers, getFactionTierModifier(tierIndex));
    }

    for (const heroClass of CLASS_IDS) {
      const count = BondSystem.countHeroesByClass(ownedHeroes, heroClass);
      const tierIndex = getHighestTierIndex(count, BONDS.CLASS_THRESHOLDS);
      modifiers = mergeGlobalModifiers(modifiers, getClassTierModifier(tierIndex));
    }

    const collectionCount = ownedHeroes.length;
    const collectionTier = getHighestTierIndex(collectionCount, BONDS.COLLECTION_THRESHOLDS);
    modifiers = mergeGlobalModifiers(modifiers, getCollectionTierModifier(collectionTier));

    const ownedIds = new Set(ownedHeroes.map((hero) => hero.id));
    for (const pair of PAIR_BOND_DEFINITIONS) {
      if (pair.heroIds.every((heroId) => ownedIds.has(heroId))) {
        modifiers = mergeGlobalModifiers(modifiers, pair.modifiers);
      }
    }

    return modifiers;
  }

  static isBondActive(save: RealmSaveDataV3, bondId: string): boolean {
    return BondSystem.buildBondCatalog(save).some(
      (bond) => bond.bondId === bondId && bond.isActive,
    );
  }

  static applyGlobalModifiers(stats: HeroStats, modifiers: GlobalStatModifiers): HeroStats {
    return SigilSystem.applyBonusesToStats(stats, modifiers);
  }

  static buildBondCatalog(save: RealmSaveDataV3): ActiveBond[] {
    const ownedHeroes = BondSystem.getOwnedHeroData(save);
    const ownedIds = new Set(ownedHeroes.map((hero) => hero.id));
    const bonds: ActiveBond[] = [];

    for (const faction of FACTION_IDS) {
      const count = BondSystem.countHeroesByFaction(ownedHeroes, faction);
      const highestTier = getHighestTierIndex(count, BONDS.FACTION_THRESHOLDS);
      BONDS.FACTION_THRESHOLDS.forEach((threshold, tierIndex) => {
        const isActive = count >= threshold;
        bonds.push({
          bondId: getFactionBondId(faction, threshold),
          type: 'faction',
          name: `${getFactionLabel(faction)} Bond ${tierIndex + 1}`,
          description: `Own ${threshold} ${getFactionLabel(faction)} heroes`,
          tier: tierIndex + 1,
          currentCount: count,
          requiredCount: threshold,
          isActive,
          contributesGlobally: isActive && tierIndex === highestTier,
          modifiers: getFactionTierModifier(tierIndex),
        });
      });
    }

    for (const heroClass of CLASS_IDS) {
      const count = BondSystem.countHeroesByClass(ownedHeroes, heroClass);
      const highestTier = getHighestTierIndex(count, BONDS.CLASS_THRESHOLDS);
      BONDS.CLASS_THRESHOLDS.forEach((threshold, tierIndex) => {
        const isActive = count >= threshold;
        bonds.push({
          bondId: getClassBondId(heroClass, threshold),
          type: 'class',
          name: `${CLASS_LABELS[heroClass]} Bond ${tierIndex + 1}`,
          description: `Own ${threshold} ${CLASS_LABELS[heroClass]} heroes`,
          tier: tierIndex + 1,
          currentCount: count,
          requiredCount: threshold,
          isActive,
          contributesGlobally: isActive && tierIndex === highestTier,
          modifiers: getClassTierModifier(tierIndex),
        });
      });
    }

    const collectionCount = ownedHeroes.length;
    const highestCollectionTier = getHighestTierIndex(collectionCount, BONDS.COLLECTION_THRESHOLDS);
    BONDS.COLLECTION_THRESHOLDS.forEach((threshold, tierIndex) => {
      const isActive = collectionCount >= threshold;
      bonds.push({
        bondId: getCollectionBondId(threshold),
        type: 'collection',
        name: `Collection Milestone ${tierIndex + 1}`,
        description: `Own ${threshold} unique heroes`,
        tier: tierIndex + 1,
        currentCount: collectionCount,
        requiredCount: threshold,
        isActive,
        contributesGlobally: isActive && tierIndex === highestCollectionTier,
        modifiers: getCollectionTierModifier(tierIndex),
      });
    });

    for (const pair of PAIR_BOND_DEFINITIONS) {
      const count = pair.heroIds.filter((heroId) => ownedIds.has(heroId)).length;
      bonds.push({
        bondId: pair.id,
        type: 'pair',
        name: pair.name,
        description: pair.description,
        tier: 1,
        currentCount: count,
        requiredCount: pair.heroIds.length,
        isActive: count >= pair.heroIds.length,
        contributesGlobally: count >= pair.heroIds.length,
        modifiers: pair.modifiers,
      });
    }

    return bonds;
  }

  static previewFactionModifiers(ownedCount: number): GlobalStatModifiers {
    const tierIndex = getHighestTierIndex(ownedCount, BONDS.FACTION_THRESHOLDS);
    return getFactionTierModifier(tierIndex);
  }

  static formatGlobalModifiers(modifiers: GlobalStatModifiers): string {
    return formatModifierSummary(modifiers);
  }

  static syncActivatedBondState(save: RealmSaveDataV3): void {
    const activeIds = BondSystem.computeActiveBonds(save)
      .filter((bond) => bond.contributesGlobally || bond.type === 'pair')
      .map((bond) => bond.bondId);
    const merged = new Set([...save.bondState.activatedBondIds, ...activeIds]);
    save.bondState.activatedBondIds = [...merged];
  }

  private static getOwnedHeroData(save: RealmSaveDataV3): HeroData[] {
    const ownedIds = new Set(
      save.ownedHeroes.filter((hero) => hero.isOwned).map((hero) => hero.heroId),
    );
    return HEROES_DATA.filter((hero) => ownedIds.has(hero.id));
  }

  private static countHeroesByFaction(heroes: HeroData[], faction: HeroFaction): number {
    return heroes.filter((hero) => hero.faction === faction).length;
  }

  private static countHeroesByClass(heroes: HeroData[], heroClass: HeroClass): number {
    return heroes.filter((hero) => hero.heroClass === heroClass).length;
  }
}
