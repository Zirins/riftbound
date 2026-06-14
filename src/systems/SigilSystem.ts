// src/systems/SigilSystem.ts
// Sigil ownership, equip/unequip, and stat bonus computation (Section 14.7).

import { SIGIL } from '../constants/gameConfig';
import {
  getSigilDefinition,
  rollSecondaryStat,
  scalePrimaryStatValue,
} from '../data/sigils';
import type {
  EquipResult,
  HeroStats,
  OwnedSigil,
  RealmSaveDataV3,
  SigilReward,
  SigilStatRoll,
  SigilStatType,
} from '../types';

type AggregatedBonuses = {
  hp: number;
  attack: number;
  defense: number;
  hpPercent: number;
  attackPercent: number;
  defensePercent: number;
  attackSpeedPercent: number;
  energyGain: number;
};

const EMPTY_BONUSES: AggregatedBonuses = {
  hp: 0,
  attack: 0,
  defense: 0,
  hpPercent: 0,
  attackPercent: 0,
  defensePercent: 0,
  attackSpeedPercent: 0,
  energyGain: 0,
};

export class SigilSystem {
  static grantSigil(
    save: RealmSaveDataV3,
    definitionId: string,
    options?: { level?: number },
  ): OwnedSigil | null {
    const definition = getSigilDefinition(definitionId);
    if (!definition) return null;

    const level = Math.min(SIGIL.MAX_LEVEL, Math.max(1, options?.level ?? 1));
    const instanceId = `sigil_${save.sigilState.nextInstanceId}`;
    save.sigilState.nextInstanceId += 1;

    const owned: OwnedSigil = {
      instanceId,
      definitionId,
      level,
      breakthroughLevel: 0,
      secondaryStats: [],
    };

    save.sigilState.ownedSigils.push(owned);
    return owned;
  }

  static grantSigilsFromRewards(save: RealmSaveDataV3, rewards: SigilReward[]): OwnedSigil[] {
    const granted: OwnedSigil[] = [];
    for (const reward of rewards) {
      const owned = SigilSystem.grantSigil(save, reward.sigilDefinitionId, { level: reward.level });
      if (owned) granted.push(owned);
    }
    return granted;
  }

  static findOwnedSigil(save: RealmSaveDataV3, instanceId: string): OwnedSigil | null {
    return save.sigilState.ownedSigils.find((sigil) => sigil.instanceId === instanceId) ?? null;
  }

  static equipSigil(
    save: RealmSaveDataV3,
    heroId: string,
    sigilInstanceId: string,
    slotIndex: 0 | 1,
  ): EquipResult {
    const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
    if (!hero) {
      return { success: false, reason: 'Hero is not owned' };
    }

    const sigil = SigilSystem.findOwnedSigil(save, sigilInstanceId);
    if (!sigil) {
      return { success: false, reason: 'Sigil not found' };
    }

    if (sigil.equippedHeroId && sigil.equippedHeroId !== heroId) {
      SigilSystem.clearHeroSlot(save, sigil.equippedHeroId, sigil.equippedSlotIndex ?? 0);
    }

    const replaced = SigilSystem.getEquippedSigilAtSlot(save, heroId, slotIndex);
    if (replaced && replaced.instanceId !== sigilInstanceId) {
      SigilSystem.clearSigilEquipState(replaced);
    }

    sigil.equippedHeroId = heroId;
    sigil.equippedSlotIndex = slotIndex;
    SigilSystem.setHeroSlotInstanceId(hero, slotIndex, sigilInstanceId);

    return { success: true };
  }

  static unequipSigil(
    save: RealmSaveDataV3,
    heroId: string,
    slotIndex: 0 | 1,
  ): EquipResult {
    const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
    if (!hero) {
      return { success: false, reason: 'Hero is not owned' };
    }

    const equipped = SigilSystem.getEquippedSigilAtSlot(save, heroId, slotIndex);
    if (!equipped) {
      return { success: false, reason: 'No Sigil equipped in slot' };
    }

    SigilSystem.clearSigilEquipState(equipped);
    SigilSystem.setHeroSlotInstanceId(hero, slotIndex, null);
    return { success: true };
  }

  static getEquippedSigils(save: RealmSaveDataV3, heroId: string): OwnedSigil[] {
    const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
    if (!hero) return [];

    const equipped: OwnedSigil[] = [];
    for (let slot = 0; slot < SIGIL.SLOTS_PER_HERO_V2; slot += 1) {
      const instanceId = hero.equippedSigilIds[slot];
      if (!instanceId) continue;
      const sigil = SigilSystem.findOwnedSigil(save, instanceId);
      if (sigil) equipped.push(sigil);
    }
    return equipped;
  }

  static computeSigilStatBonuses(save: RealmSaveDataV3, heroId: string): Partial<HeroStats> {
    const equipped = SigilSystem.getEquippedSigils(save, heroId);
    const aggregated = EMPTY_BONUSES;

    for (const owned of equipped) {
      const definition = getSigilDefinition(owned.definitionId);
      if (!definition) continue;
      SigilSystem.addOwnedSigilBonuses(aggregated, owned, definition);
    }

    return SigilSystem.toHeroStatBonuses(aggregated);
  }

  static applyBonusesToStats(base: HeroStats, bonuses: Partial<HeroStats>): HeroStats {
    const flatHp = base.hp + (bonuses.hp ?? 0);
    const flatAttack = base.attack + (bonuses.attack ?? 0);
    const flatDefense = base.defense + (bonuses.defense ?? 0);

    return {
      hp: Math.floor(flatHp * (1 + (bonuses.hpPercent ?? 0))),
      attack: Math.floor(flatAttack * (1 + (bonuses.attackPercent ?? 0))),
      defense: Math.floor(flatDefense * (1 + (bonuses.defensePercent ?? 0))),
      attackSpeed: (base.attackSpeed ?? 0) * (1 + (bonuses.attackSpeedPercent ?? 0)),
      energyGain: (base.energyGain ?? 0) + (bonuses.energyGain ?? 0),
      critChance: base.critChance,
      critDamage: base.critDamage,
      dodgeChance: base.dodgeChance,
    };
  }

  static computeOwnedSigilBonuses(owned: OwnedSigil): Partial<HeroStats> {
    const definition = getSigilDefinition(owned.definitionId);
    if (!definition) return {};

    const aggregated = { ...EMPTY_BONUSES };
    SigilSystem.addOwnedSigilBonuses(aggregated, owned, definition);
    return SigilSystem.toHeroStatBonuses(aggregated);
  }

  private static addOwnedSigilBonuses(
    aggregated: AggregatedBonuses,
    owned: OwnedSigil,
    definition: ReturnType<typeof getSigilDefinition> & object,
  ): void {
    const primaryValue = scalePrimaryStatValue(definition.primaryStat.value, owned.level);
    SigilSystem.addStatValue(aggregated, definition.primaryStat.statType, primaryValue);

    for (const roll of owned.secondaryStats) {
      SigilSystem.addStatValue(aggregated, roll.statType, roll.value);
    }
  }

  private static addStatValue(
    aggregated: AggregatedBonuses,
    statType: SigilStatType,
    value: number,
  ): void {
    switch (statType) {
      case 'hp':
        aggregated.hp += value;
        break;
      case 'attack':
        aggregated.attack += value;
        break;
      case 'defense':
        aggregated.defense += value;
        break;
      case 'hpPercent':
        aggregated.hpPercent += value;
        break;
      case 'attackPercent':
        aggregated.attackPercent += value;
        break;
      case 'defensePercent':
        aggregated.defensePercent += value;
        break;
      case 'attackSpeedPercent':
        aggregated.attackSpeedPercent += value;
        break;
      case 'energyGain':
        aggregated.energyGain += value;
        break;
      default:
        break;
    }
  }

  private static toHeroStatBonuses(aggregated: AggregatedBonuses): Partial<HeroStats> {
    const bonuses: Partial<HeroStats> = {};
    if (aggregated.hp > 0) bonuses.hp = aggregated.hp;
    if (aggregated.attack > 0) bonuses.attack = aggregated.attack;
    if (aggregated.defense > 0) bonuses.defense = aggregated.defense;
    if (aggregated.hpPercent > 0) bonuses.hpPercent = aggregated.hpPercent;
    if (aggregated.attackPercent > 0) bonuses.attackPercent = aggregated.attackPercent;
    if (aggregated.defensePercent > 0) bonuses.defensePercent = aggregated.defensePercent;
    if (aggregated.attackSpeedPercent > 0) bonuses.attackSpeedPercent = aggregated.attackSpeedPercent;
    if (aggregated.energyGain > 0) bonuses.energyGain = aggregated.energyGain;
    return bonuses;
  }

  private static getEquippedSigilAtSlot(
    save: RealmSaveDataV3,
    heroId: string,
    slotIndex: 0 | 1,
  ): OwnedSigil | null {
    const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
    if (!hero) return null;

    const instanceId = hero.equippedSigilIds[slotIndex];
    if (!instanceId) return null;
    return SigilSystem.findOwnedSigil(save, instanceId);
  }

  private static setHeroSlotInstanceId(
    hero: RealmSaveDataV3['ownedHeroes'][number],
    slotIndex: 0 | 1,
    instanceId: string | null,
  ): void {
    const slots = [...hero.equippedSigilIds];
    while (slots.length < SIGIL.SLOTS_PER_HERO_V2) {
      slots.push('');
    }
    slots[slotIndex] = instanceId ?? '';
    hero.equippedSigilIds = slots;
  }

  private static clearSigilEquipState(sigil: OwnedSigil): void {
    sigil.equippedHeroId = undefined;
    sigil.equippedSlotIndex = undefined;
  }

  private static clearHeroSlot(
    save: RealmSaveDataV3,
    heroId: string,
    slotIndex: 0 | 1,
  ): void {
    const hero = save.ownedHeroes.find((entry) => entry.heroId === heroId && entry.isOwned);
    if (!hero) return;
    SigilSystem.setHeroSlotInstanceId(hero, slotIndex, null);
  }

  static rollBreakthroughSecondary(
    owned: OwnedSigil,
    breakthroughIndex: number,
  ): SigilStatRoll | null {
    const definition = getSigilDefinition(owned.definitionId);
    if (!definition) return null;
    return rollSecondaryStat(definition, breakthroughIndex);
  }
}
