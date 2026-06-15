// src/data/heroKits.ts
// V2 hero combat kits — passive, ultimate, side skills, awakening (Sections 11–12).

import { AWAKENING, HERO_NEW, HEROES } from '../constants/gameConfig';
import { HEROES_DATA } from './heroes';
import type {
  AwakeningLevelData,
  HeroCombatKit,
  HeroSkill,
  HeroStats,
  KitHeroClass,
  SkillEffect,
  SkillModifier,
  SkillTag,
  TargetRule,
} from '../types';

// ─── Kit builders ─────────────────────────────────────────────────────────────

function awakening(
  level: 1 | 2 | 3,
  description: string,
  statBonuses: Partial<HeroStats>,
  skillModifiers: SkillModifier[],
): AwakeningLevelData {
  return {
    level,
    requiredStarRank: 5,
    costs: {
      gold: AWAKENING.GOLD_COSTS[level - 1],
      awakeningCrystals: AWAKENING.CRYSTAL_COSTS[level - 1],
    },
    statBonuses,
    skillModifiers,
    description,
  };
}

function skill(
  id: string,
  heroId: string,
  name: string,
  type: HeroSkill['type'],
  description: string,
  trigger: HeroSkill['trigger'],
  targetRule: TargetRule,
  effects: SkillEffect[],
  tags: SkillTag[],
  options?: Pick<HeroSkill, 'cooldownMs' | 'initialCooldownMs' | 'energyCost'>,
): HeroSkill {
  return {
    id,
    heroId,
    name,
    type,
    description,
    trigger,
    targetRule,
    effects,
    tags,
    ...options,
  };
}

function atkDamage(multiplier: number, extra?: Partial<SkillEffect>): SkillEffect {
  return {
    effectType: 'damage',
    scaling: { stat: 'atk', multiplier },
    ...extra,
  };
}

function flatDamage(amount: number, extra?: Partial<SkillEffect>): SkillEffect {
  return { effectType: 'damage', flatAmount: amount, ...extra };
}

function flatHeal(amount: number): SkillEffect {
  return { effectType: 'heal', flatAmount: amount };
}

function applyStatus(
  statusId: SkillEffect['statusId'],
  durationMs: number,
  flatAmount?: number,
): SkillEffect {
  return { effectType: 'apply_status', statusId, durationMs, flatAmount };
}

function shield(flatAmount: number, durationMs: number): SkillEffect {
  return { effectType: 'shield', flatAmount, durationMs };
}

function gainEnergy(amount: number): SkillEffect {
  return { effectType: 'gain_energy', flatAmount: amount };
}

function statMod(
  statusId: SkillEffect['statusId'],
  durationMs: number,
  flatAmount?: number,
): SkillEffect {
  return { effectType: 'stat_modifier', statusId, durationMs, flatAmount };
}

// ─── Kael — Iron Vanguard tank ────────────────────────────────────────────────

const K = HEROES.KAEL;

const kaelKit: HeroCombatKit = {
  heroId: K.ID,
  role: 'frontline_tank',
  classType: 'vanguard',
  element: 'iron',
  targetingProfile: { defaultTargetRule: 'nearest_enemy', fallbackTargetRule: 'frontline_enemy' },
  aiProfile: {
    ultimatePriority: 'ally_low_hp',
    sideSkillPriority: ['kael_guard_break', 'kael_iron_step', 'kael_battle_oath'],
  },
  passive: skill(
    'iron_taunt',
    K.ID,
    'Iron Taunt',
    'passive',
    `After ${K.TAUNT_HIT_COUNT} hits taken, gain Fortified and draw enemy focus.`,
    'on_hit',
    'self',
    [statMod('damage_reduction', K.TAUNT_DURATION, 0.25)],
    ['buff'],
  ),
  ultimate: skill(
    'iron_pulse',
    K.ID,
    'Iron Pulse',
    'ultimate',
    'Pulse iron resonance — damage nearby foes and shield all allies.',
    'manual_or_auto_ultimate',
    'area_circle',
    [
      flatDamage(K.ULTIMATE_DAMAGE, { area: { shape: 'circle', radius: K.PULSE_RADIUS } }),
      shield(K.SHIELD_VALUE, K.SHIELD_DURATION),
    ],
    ['damage', 'shield', 'area'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'kael_guard_break',
      K.ID,
      'Guard Break',
      'side',
      'Smash an enemy guard, dealing damage and exposing weak points.',
      'cooldown',
      'nearest_enemy',
      [atkDamage(1.8), applyStatus('vulnerable', 3000, 0.15)],
      ['damage', 'debuff'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'kael_iron_step',
      K.ID,
      'Iron Step',
      'side',
      'Brace behind an iron veil, gaining a personal shield and damage reduction.',
      'cooldown',
      'self',
      [shield(180, 4000), statMod('damage_reduction', 4000, 0.20)],
      ['shield', 'buff'],
      { cooldownMs: 12000, initialCooldownMs: 3000 },
    ),
    skill(
      'kael_battle_oath',
      K.ID,
      'Battle Oath',
      'side',
      'Rally allies with a battle oath, raising their attack.',
      'cooldown',
      'all_allies',
      [statMod('atk_up', 5000, 0.12)],
      ['buff'],
      { cooldownMs: 14000, initialCooldownMs: 4000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Iron resonance thickens — more HP and stronger pulse shields.', { hp: 400 }, [
      { targetSkillId: 'iron_pulse', modifierType: 'increase_multiplier', value: 0.15 },
    ]),
    awakening(2, 'Guard Break exposes foes longer and hits harder.', { defense: 30 }, [
      { targetSkillId: 'kael_guard_break', modifierType: 'increase_duration', value: 1500 },
      { targetSkillId: 'kael_guard_break', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(3, 'Iron Pulse also fortifies allies after the shockwave.', { hp: 600, defense: 40 }, [
      {
        targetSkillId: 'iron_pulse',
        modifierType: 'add_effect',
        value: statMod('damage_reduction', 3000, 0.10),
      },
    ]),
  ],
};

// ─── Sura — Ember bruiser ─────────────────────────────────────────────────────

const S = HEROES.SURA;

const suraKit: HeroCombatKit = {
  heroId: S.ID,
  role: 'bruiser',
  classType: 'striker',
  element: 'flame',
  targetingProfile: { defaultTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'enemy_clustered',
    sideSkillPriority: ['sura_scorch_mark', 'sura_flame_chain', 'sura_reckoning'],
  },
  passive: skill(
    'ember_cleave',
    S.ID,
    'Ember Cleave',
    'passive',
    `Every ${S.CLEAVE_HIT_COUNT} basic attacks, unleash a flame cleave around Chi Feng.`,
    'on_hit',
    'area_circle',
    [
      atkDamage(S.CLEAVE_ENERGY_MULT * 2, { area: { shape: 'circle', radius: S.CLEAVE_RADIUS } }),
      gainEnergy(8),
    ],
    ['damage', 'area', 'energy_gain'],
  ),
  ultimate: skill(
    'solar_rend',
    S.ID,
    'Solar Rend',
    'ultimate',
    'Rend the battlefield with solar flame, burning all enemies in a wide band.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [
      flatDamage(S.ULTIMATE_DAMAGE),
      applyStatus('burn', S.BURN_DURATION, S.BURN_DPS),
    ],
    ['damage', 'damage_over_time', 'area', 'debuff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'sura_flame_chain',
      S.ID,
      'Flame Chain',
      'side',
      'Lash a foe with chained flame, spreading burn.',
      'cooldown',
      'nearest_enemy',
      [atkDamage(2.0), applyStatus('burn', 2500, 60)],
      ['damage', 'damage_over_time'],
      { cooldownMs: 7000, initialCooldownMs: 1500 },
    ),
    skill(
      'sura_reckoning',
      S.ID,
      'Reckoning',
      'side',
      'Chi Feng feeds on battle fury, raising attack and stealing life.',
      'cooldown',
      'self',
      [statMod('atk_up', 6000, 0.18)],
      ['buff', 'lifesteal'],
      { cooldownMs: 11000, initialCooldownMs: 3000 },
    ),
    skill(
      'sura_scorch_mark',
      S.ID,
      'Scorch Mark',
      'side',
      'Mark the weakest enemy for execution — they become vulnerable.',
      'cooldown',
      'lowest_hp_enemy',
      [atkDamage(1.4), applyStatus('vulnerable', 4000, 0.20)],
      ['damage', 'debuff', 'execute'],
      { cooldownMs: 9000, initialCooldownMs: 2000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Solar heat intensifies — more attack and longer burns.', { attack: 40 }, [
      { targetSkillId: 'solar_rend', modifierType: 'increase_duration', value: 1000 },
    ]),
    awakening(2, 'Ember Cleave radius expands and hits harder.', { attack: 60 }, [
      { targetSkillId: 'ember_cleave', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
    awakening(3, 'Solar Rend ignites with a secondary explosion on burning targets.', { attack: 80, hp: 200 }, [
      {
        targetSkillId: 'solar_rend',
        modifierType: 'add_status',
        value: applyStatus('vulnerable', 2000, 0.10),
      },
    ]),
  ],
};

// ─── Mira — Spirit healer ─────────────────────────────────────────────────────

const M = HEROES.MIRA;

const miraKit: HeroCombatKit = {
  heroId: M.ID,
  role: 'healer',
  classType: 'oracle',
  element: 'light',
  targetingProfile: { defaultTargetRule: 'lowest_hp_ally', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'ally_low_hp',
    sideSkillPriority: ['mira_spirit_lantern', 'mira_veil_mend', 'mira_radiance'],
  },
  passive: skill(
    'lantern_pulse',
    M.ID,
    'Lantern Pulse',
    'passive',
    'Periodically heal the most injured ally with spirit light.',
    'after_seconds',
    'lowest_hp_ally',
    [flatHeal(M.PASSIVE_HEAL), gainEnergy(M.PASSIVE_ENERGY_GAIN)],
    ['heal', 'energy_gain'],
    { cooldownMs: M.HEAL_COOLDOWN },
  ),
  ultimate: skill(
    'rift_bloom',
    M.ID,
    'Rift Bloom',
    'ultimate',
    'Bloom radiant energy — heal and shield the entire formation.',
    'manual_or_auto_ultimate',
    'all_allies',
    [flatHeal(M.ULTIMATE_HEAL), shield(120, 5000)],
    ['heal', 'shield', 'area'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'mira_spirit_lantern',
      M.ID,
      'Spirit Lantern',
      'side',
      'Focus healing on one ally and restore their energy.',
      'cooldown',
      'lowest_hp_ally',
      [flatHeal(140), gainEnergy(20)],
      ['heal', 'energy_gain'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'mira_veil_mend',
      M.ID,
      'Veil Mend',
      'side',
      'Cleanse wounds and mend spirit fractures on a struggling ally.',
      'cooldown',
      'lowest_hp_ally',
      [
        { effectType: 'remove_status', statusId: 'wound' },
        flatHeal(100),
      ],
      ['heal', 'buff'],
      { cooldownMs: 10000, initialCooldownMs: 3000 },
    ),
    skill(
      'mira_radiance',
      M.ID,
      'Radiance',
      'side',
      'Bathe allies in haste, quickening their actions.',
      'cooldown',
      'all_allies',
      [statMod('haste', 5000, 0.15)],
      ['buff'],
      { cooldownMs: 13000, initialCooldownMs: 4000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Lantern light grows warmer — stronger passive heals.', { hp: 150 }, [
      { targetSkillId: 'lantern_pulse', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(2, 'Rift Bloom shields last longer.', { hp: 200 }, [
      { targetSkillId: 'rift_bloom', modifierType: 'increase_duration', value: 2000 },
    ]),
    awakening(3, 'Veil Mend also grants a brief shield after cleansing.', { hp: 300 }, [
      {
        targetSkillId: 'mira_veil_mend',
        modifierType: 'add_effect',
        value: shield(150, 3000),
      },
    ]),
  ],
};

// ─── Nyra — Void marksman ─────────────────────────────────────────────────────

const N = HEROES.NYRA;

const nyraKit: HeroCombatKit = {
  heroId: N.ID,
  role: 'ranged_dps',
  classType: 'striker',
  element: 'void',
  targetingProfile: { defaultTargetRule: 'backline_enemy', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'execute',
    sideSkillPriority: ['nyra_piercing_shot', 'nyra_mark_target', 'nyra_retreat_step'],
  },
  passive: skill(
    'void_echo',
    N.ID,
    'Void Echo',
    'passive',
    `Basic attacks have a ${Math.round(N.ECHO_CHANCE * 100)}% chance to echo for bonus void damage.`,
    'on_hit',
    'nearest_enemy',
    [atkDamage(N.ECHO_DAMAGE_MULT)],
    ['damage'],
  ),
  ultimate: skill(
    'void_barrage',
    N.ID,
    'Void Barrage',
    'ultimate',
    `Unleash ${N.ARROW_COUNT} void arrows across the enemy backline.`,
    'manual_or_auto_ultimate',
    'backline_enemy',
    [
      flatDamage(N.ARROW_DAMAGE, { maxTargets: N.ARROW_COUNT }),
      applyStatus('vulnerable', 2000, 0.10),
    ],
    ['damage', 'area', 'debuff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'nyra_piercing_shot',
      N.ID,
      'Piercing Shot',
      'side',
      'Fire a piercing void arrow at the backline.',
      'cooldown',
      'backline_enemy',
      [atkDamage(2.2)],
      ['damage'],
      { cooldownMs: 6000, initialCooldownMs: 1000 },
    ),
    skill(
      'nyra_mark_target',
      N.ID,
      'Hunter Mark',
      'side',
      'Mark the highest-threat enemy, increasing damage they take.',
      'cooldown',
      'highest_atk_enemy',
      [applyStatus('vulnerable', 5000, 0.18)],
      ['debuff'],
      { cooldownMs: 9000, initialCooldownMs: 2000 },
    ),
    skill(
      'nyra_retreat_step',
      N.ID,
      'Retreat Step',
      'side',
      'Step back from danger and gain haste.',
      'cooldown',
      'self',
      [statMod('haste', 4000, 0.20)],
      ['buff', 'dash'],
      { cooldownMs: 10000, initialCooldownMs: 3000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Void arrows strike harder from the backline.', { attack: 35 }, [
      { targetSkillId: 'void_barrage', modifierType: 'increase_multiplier', value: 0.15 },
    ]),
    awakening(2, 'Echo chance and damage increase.', { attack: 50, critChance: 0.05 }, [
      { targetSkillId: 'void_echo', modifierType: 'increase_multiplier', value: 0.30 },
    ]),
    awakening(3, 'Piercing Shot applies a brief stun on critical strikes.', { attack: 70 }, [
      {
        targetSkillId: 'nyra_piercing_shot',
        modifierType: 'add_status',
        value: applyStatus('stun', 800),
      },
    ]),
  ],
};

// ─── Ren Vale — Veil assassin ─────────────────────────────────────────────────

const R = HERO_NEW.REN;

const renKit: HeroCombatKit = {
  heroId: R.ID,
  role: 'assassin',
  classType: 'striker',
  element: 'void',
  targetingProfile: { defaultTargetRule: 'backline_enemy', fallbackTargetRule: 'lowest_hp_enemy' },
  aiProfile: {
    ultimatePriority: 'execute',
    sideSkillPriority: ['ren_hollow_strike', 'ren_shadow_feint', 'ren_fade'],
  },
  passive: skill(
    'veilstep',
    R.ID,
    'Veilstep',
    'passive',
    `Every ${R.MARK_HIT_COUNT} hits, mark the target — they take increased damage.`,
    'on_hit',
    'nearest_enemy',
    [applyStatus('vulnerable', R.MARK_DURATION, R.MARK_DAMAGE_BONUS)],
    ['debuff'],
  ),
  ultimate: skill(
    'quietus_dash',
    R.ID,
    'Quietus Dash',
    'ultimate',
    'Blink through the veil and execute a marked foe with armor-piercing force.',
    'manual_or_auto_ultimate',
    'lowest_hp_enemy',
    [
      { effectType: 'move_to_target' },
      flatDamage(R.ULTIMATE_DAMAGE),
      applyStatus('vulnerable', 2000, 0.15),
    ],
    ['dash', 'damage', 'execute'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'ren_shadow_feint',
      R.ID,
      'Shadow Feint',
      'side',
      'Feint forward and slash before retreating into the veil.',
      'cooldown',
      'nearest_enemy',
      [
        { effectType: 'move_to_target' },
        atkDamage(1.6),
      ],
      ['dash', 'damage'],
      { cooldownMs: 7000, initialCooldownMs: 1500 },
    ),
    skill(
      'ren_hollow_strike',
      R.ID,
      'Hollow Strike',
      'side',
      'Strike the enemy backline with a precision void blade.',
      'cooldown',
      'backline_enemy',
      [atkDamage(2.4)],
      ['damage', 'execute'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'ren_fade',
      R.ID,
      'Fade',
      'side',
      'Fade from focus, gaining haste and damage reduction.',
      'cooldown',
      'self',
      [statMod('haste', 3000, 0.25), statMod('damage_reduction', 3000, 0.15)],
      ['buff', 'dash'],
      { cooldownMs: 11000, initialCooldownMs: 3000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Veil marks cut deeper.', { attack: 45 }, [
      { targetSkillId: 'veilstep', modifierType: 'increase_duration', value: 1000 },
    ]),
    awakening(2, 'Quietus Dash cooldown shortens.', { attack: 65, critChance: 0.05 }, [
      { targetSkillId: 'quietus_dash', modifierType: 'reduce_cooldown', value: 2000 },
    ]),
    awakening(3, 'Hollow Strike gains bonus damage against vulnerable foes.', { attack: 90 }, [
      { targetSkillId: 'ren_hollow_strike', modifierType: 'increase_multiplier', value: 0.35 },
    ]),
  ],
};

// ─── Solenne Arclight — Arc caster ────────────────────────────────────────────

const SO = HERO_NEW.SOLENNE;

const solenneKit: HeroCombatKit = {
  heroId: SO.ID,
  role: 'caster',
  classType: 'mystic',
  element: 'storm',
  targetingProfile: { defaultTargetRule: 'densest_enemy_cluster', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'enemy_clustered',
    sideSkillPriority: ['solenne_arc_lance', 'solenne_static_field', 'solenne_overload'],
  },
  passive: skill(
    'arc_flare',
    SO.ID,
    'Arc Flare',
    'passive',
    'Basic attacks arc to nearby foes for splash lightning damage.',
    'on_hit',
    'area_circle',
    [
      atkDamage(SO.SPLASH_DAMAGE_MULT, { area: { shape: 'circle', radius: SO.SPLASH_RADIUS } }),
    ],
    ['damage', 'area'],
  ),
  ultimate: skill(
    'sunthread_burst',
    SO.ID,
    'Sunthread Burst',
    'ultimate',
    'Weave sunthread lightning through the enemy formation, slowing all foes.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [
      flatDamage(SO.ULTIMATE_DAMAGE),
      applyStatus('slow', SO.SLOW_DURATION, SO.SLOW_AMOUNT),
    ],
    ['damage', 'control', 'area', 'debuff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'solenne_arc_lance',
      SO.ID,
      'Arc Lance',
      'side',
      'Hurl a concentrated arc lance at the densest enemy cluster.',
      'cooldown',
      'densest_enemy_cluster',
      [atkDamage(2.5, { area: { shape: 'circle', radius: 80 } })],
      ['damage', 'area'],
      { cooldownMs: 7500, initialCooldownMs: 2000 },
    ),
    skill(
      'solenne_static_field',
      SO.ID,
      'Static Field',
      'side',
      'Charge the battlefield with static, slowing all enemies.',
      'cooldown',
      'all_enemies',
      [applyStatus('slow', 3500, 0.25)],
      ['control', 'debuff', 'area'],
      { cooldownMs: 11000, initialCooldownMs: 3500 },
    ),
    skill(
      'solenne_overload',
      SO.ID,
      'Overload',
      'side',
      'Overcharge arc weave — gain energy and release a shock burst.',
      'cooldown',
      'area_circle',
      [gainEnergy(30), atkDamage(1.2, { area: { shape: 'circle', radius: 70 } })],
      ['energy_gain', 'damage', 'area'],
      { cooldownMs: 13000, initialCooldownMs: 4000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Arc potency increases.', { attack: 40 }, [
      { targetSkillId: 'sunthread_burst', modifierType: 'increase_multiplier', value: 0.15 },
    ]),
    awakening(2, 'Static Field slow intensifies.', { attack: 55 }, [
      { targetSkillId: 'solenne_static_field', modifierType: 'increase_duration', value: 1500 },
    ]),
    awakening(3, 'Sunthread Burst also silences foes briefly.', { attack: 75 }, [
      {
        targetSkillId: 'sunthread_burst',
        modifierType: 'add_status',
        value: applyStatus('silence', 1200),
      },
    ]),
  ],
};

// ─── Veyra Hollowglass — Mirror hexer ─────────────────────────────────────────

const V = HERO_NEW.VEYRA;

const veyraKit: HeroCombatKit = {
  heroId: V.ID,
  role: 'controller',
  classType: 'mystic',
  element: 'void',
  targetingProfile: { defaultTargetRule: 'highest_atk_enemy', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'enemy_clustered',
    sideSkillPriority: ['veyra_shatter_mirror', 'veyra_hex_bind', 'veyra_glass_heal'],
  },
  passive: skill(
    'hollow_glare',
    V.ID,
    'Hollow Glare',
    'passive',
    'Periodically hex the highest-attack enemy, reducing their threat.',
    'after_seconds',
    'highest_atk_enemy',
    [applyStatus('slow', V.GLARE_INTERVAL, V.ATTACK_REDUCE_PCT), applyStatus('vulnerable', 2000, 0.08)],
    ['debuff', 'control'],
    { cooldownMs: V.GLARE_INTERVAL },
  ),
  ultimate: skill(
    'mirror_hex',
    V.ID,
    'Mirror Hex',
    'ultimate',
    'Shatter mirror hex across enemies — damage, silence, and vulnerability.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [
      flatDamage(V.ULTIMATE_DAMAGE),
      applyStatus('silence', 2000),
      applyStatus('vulnerable', V.HEX_DURATION, 0.12),
    ],
    ['damage', 'control', 'debuff', 'area'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'veyra_shatter_mirror',
      V.ID,
      'Shatter Mirror',
      'side',
      'Shatter a mirror image into an enemy, leaving them vulnerable.',
      'cooldown',
      'highest_atk_enemy',
      [atkDamage(1.8), applyStatus('vulnerable', 4000, 0.16)],
      ['damage', 'debuff'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'veyra_hex_bind',
      V.ID,
      'Hex Bind',
      'side',
      'Bind a foe in hex glass, briefly stunning them.',
      'cooldown',
      'nearest_enemy',
      [atkDamage(1.2), applyStatus('stun', 1200)],
      ['control', 'damage'],
      { cooldownMs: 12000, initialCooldownMs: 4000 },
    ),
    skill(
      'veyra_glass_heal',
      V.ID,
      'Glass Heal',
      'side',
      'Redirect mirror light to heal and shield a wounded ally.',
      'cooldown',
      'lowest_hp_ally',
      [flatHeal(110), shield(90, 3500)],
      ['heal', 'shield'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Hex resonance deepens.', { hp: 120 }, [
      { targetSkillId: 'mirror_hex', modifierType: 'increase_duration', value: 1000 },
    ]),
    awakening(2, 'Hollow Glare applies wound on hexed foes.', { hp: 180 }, [
      {
        targetSkillId: 'hollow_glare',
        modifierType: 'add_status',
        value: applyStatus('wound', 3000, 0.20),
      },
    ]),
    awakening(3, 'Hex Bind stun lasts longer and Shatter Mirror hits harder.', { hp: 250 }, [
      { targetSkillId: 'veyra_hex_bind', modifierType: 'increase_duration', value: 600 },
      { targetSkillId: 'veyra_shatter_mirror', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
  ],
};

// ─── Thane Ironroot — Rootguard warden ────────────────────────────────────────

const T = HERO_NEW.THANE;

const thaneKit: HeroCombatKit = {
  heroId: T.ID,
  role: 'frontline_tank',
  classType: 'warden',
  element: 'stone',
  targetingProfile: { defaultTargetRule: 'frontline_enemy', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'ally_low_hp',
    sideSkillPriority: ['thane_root_slam', 'thane_bark_wall', 'thane_thornbind'],
  },
  passive: skill(
    'rootguard',
    T.ID,
    'Rootguard',
    'passive',
    'Each hit taken stacks defense — roots anchor Yan Gen against assault.',
    'on_hit',
    'self',
    [statMod('def_up', 8000, T.ROOTGUARD_STACK / 100)],
    ['buff'],
  ),
  ultimate: skill(
    'ironbark_stand',
    T.ID,
    'Ironbark Stand',
    'ultimate',
    'Root into the earth — massive self shield and ally fortification.',
    'manual_or_auto_ultimate',
    'self',
    [
      shield(T.SHIELD_VALUE, 5000),
      statMod('damage_reduction', T.TAUNT_DURATION, 0.30),
      statMod('def_up', T.TAUNT_DURATION, 0.20),
    ],
    ['shield', 'buff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'thane_root_slam',
      T.ID,
      'Root Slam',
      'side',
      'Slam the ground, damaging and slowing frontline foes.',
      'cooldown',
      'frontline_enemy',
      [atkDamage(1.5), applyStatus('slow', 3000, 0.22)],
      ['damage', 'control', 'area'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'thane_bark_wall',
      T.ID,
      'Bark Wall',
      'side',
      'Raise a bark barrier, shielding Yan Gen and reducing damage taken.',
      'cooldown',
      'self',
      [shield(250, 4500), statMod('damage_reduction', 4500, 0.18)],
      ['shield', 'buff'],
      { cooldownMs: 12000, initialCooldownMs: 3000 },
    ),
    skill(
      'thane_thornbind',
      T.ID,
      'Thornbind',
      'side',
      'Thorns expose nearby enemies, making them vulnerable.',
      'cooldown',
      'area_circle',
      [
        {
          effectType: 'apply_status',
          statusId: 'vulnerable',
          durationMs: 4000,
          flatAmount: 0.14,
          area: { shape: 'circle', radius: 90 },
        },
      ],
      ['debuff', 'area'],
      { cooldownMs: 10000, initialCooldownMs: 3500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Rootguard stacks grant more defense.', { hp: 500, defense: 50 }, [
      { targetSkillId: 'rootguard', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(2, 'Ironbark Stand shield grows thicker.', { hp: 700, defense: 70 }, [
      { targetSkillId: 'ironbark_stand', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
    awakening(3, 'Root Slam also briefly stuns on impact.', { hp: 900, defense: 90 }, [
      {
        targetSkillId: 'thane_root_slam',
        modifierType: 'add_status',
        value: applyStatus('stun', 600),
      },
    ]),
  ],
};

// ─── Caira Dawnveil — Dawn healer ─────────────────────────────────────────────

const C = HERO_NEW.CAIRA;

const cairaKit: HeroCombatKit = {
  heroId: C.ID,
  role: 'healer',
  classType: 'oracle',
  element: 'light',
  targetingProfile: { defaultTargetRule: 'lowest_hp_ally', fallbackTargetRule: 'all_allies' },
  aiProfile: {
    ultimatePriority: 'ally_low_hp',
    sideSkillPriority: ['caira_morning_light', 'caira_sanctuary', 'caira_dawn_haste'],
  },
  passive: skill(
    'dawn_mercy',
    C.ID,
    'Dawn Mercy',
    'passive',
    `Heal the lowest-HP ally each pulse — doubled below ${Math.round(C.LOW_HP_THRESHOLD * 100)}% HP.`,
    'after_seconds',
    'lowest_hp_ally',
    [flatHeal(C.PASSIVE_HEAL)],
    ['heal'],
    { cooldownMs: C.HEAL_COOLDOWN },
  ),
  ultimate: skill(
    'veil_of_morning',
    C.ID,
    'Veil of Morning',
    'ultimate',
    'Wrap allies in dawn light — major heal and protective shields.',
    'manual_or_auto_ultimate',
    'all_allies',
    [flatHeal(C.ULTIMATE_HEAL), shield(C.SHIELD_VALUE, 6000)],
    ['heal', 'shield', 'area'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'caira_morning_light',
      C.ID,
      'Morning Light',
      'side',
      'Cleanse wounds and bathe an ally in restorative dawn.',
      'cooldown',
      'lowest_hp_ally',
      [
        { effectType: 'remove_status', statusId: 'wound' },
        flatHeal(160),
      ],
      ['heal', 'buff'],
      { cooldownMs: 7500, initialCooldownMs: 2000 },
    ),
    skill(
      'caira_sanctuary',
      C.ID,
      'Sanctuary',
      'side',
      'Raise a sanctuary ward, shielding the entire formation.',
      'cooldown',
      'all_allies',
      [shield(100, 5000)],
      ['shield', 'buff'],
      { cooldownMs: 14000, initialCooldownMs: 4000 },
    ),
    skill(
      'caira_dawn_haste',
      C.ID,
      'Dawn Haste',
      'side',
      'The dawn quickens ally reflexes and restores energy.',
      'cooldown',
      'all_allies',
      [statMod('haste', 5000, 0.18), gainEnergy(12)],
      ['buff', 'energy_gain'],
      { cooldownMs: 12000, initialCooldownMs: 3500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Dawn mercy heals more generously.', { hp: 200 }, [
      { targetSkillId: 'dawn_mercy', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
    awakening(2, 'Veil of Morning shields are stronger.', { hp: 300 }, [
      { targetSkillId: 'veil_of_morning', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(3, 'Morning Light also grants brief damage reduction.', { hp: 450 }, [
      {
        targetSkillId: 'caira_morning_light',
        modifierType: 'add_effect',
        value: statMod('damage_reduction', 3000, 0.12),
      },
    ]),
  ],
};

// ─── Marek Stormreign — Storm bruiser ─────────────────────────────────────────

const MK = HERO_NEW.MAREK;

const marekKit: HeroCombatKit = {
  heroId: MK.ID,
  role: 'bruiser',
  classType: 'striker',
  element: 'storm',
  targetingProfile: { defaultTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'asap',
    sideSkillPriority: ['marek_thunder_step', 'marek_squall_break', 'marek_gale_force'],
  },
  passive: skill(
    'gathering_squall',
    MK.ID,
    'Gathering Squall',
    'passive',
    'Each strike builds squall momentum, stacking attack power.',
    'on_hit',
    'self',
    [statMod('atk_up', MK.SQUALL_RESET_TIME, MK.SQUALL_STACK / 100)],
    ['buff'],
  ),
  ultimate: skill(
    'stormreign_cleave',
    MK.ID,
    'Stormreign Cleave',
    'ultimate',
    'Cleave a storm path through enemies, staggering survivors.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [
      flatDamage(MK.ULTIMATE_DAMAGE),
      applyStatus('slow', MK.STAGGER_DURATION, MK.STAGGER_SPEED_REDUCE),
    ],
    ['damage', 'area', 'control'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'marek_thunder_step',
      MK.ID,
      'Thunder Step',
      'side',
      'Dash through a foe with thunderous force.',
      'cooldown',
      'nearest_enemy',
      [
        { effectType: 'move_to_target' },
        atkDamage(2.0),
      ],
      ['dash', 'damage'],
      { cooldownMs: 7000, initialCooldownMs: 1500 },
    ),
    skill(
      'marek_squall_break',
      MK.ID,
      'Squall Break',
      'side',
      'Finish a weakened enemy with a concentrated squall strike.',
      'cooldown',
      'lowest_hp_enemy',
      [atkDamage(3.0)],
      ['damage', 'execute'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
    skill(
      'marek_gale_force',
      MK.ID,
      'Gale Force',
      'side',
      'Unleash gale winds — damage and slow the enemy line.',
      'cooldown',
      'all_enemies',
      [atkDamage(1.3), applyStatus('slow', 3000, 0.20)],
      ['damage', 'control', 'area'],
      { cooldownMs: 11000, initialCooldownMs: 3500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Squall stacks build faster.', { attack: 50 }, [
      { targetSkillId: 'gathering_squall', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(2, 'Stormreign Cleave hits harder.', { attack: 75 }, [
      { targetSkillId: 'stormreign_cleave', modifierType: 'increase_multiplier', value: 0.18 },
    ]),
    awakening(3, 'Squall Break gains bonus damage against slowed foes.', { attack: 100, hp: 250 }, [
      { targetSkillId: 'marek_squall_break', modifierType: 'increase_multiplier', value: 0.40 },
    ]),
  ],
};

// ─── Lin Mo — Hollow isolation assassin ───────────────────────────────────────

const LN = HERO_NEW.LIN;

const linKit: HeroCombatKit = {
  heroId: LN.ID,
  role: 'assassin',
  classType: 'striker',
  element: 'void',
  targetingProfile: { defaultTargetRule: 'backline_enemy', fallbackTargetRule: 'isolated_enemy' },
  aiProfile: {
    ultimatePriority: 'execute',
    sideSkillPriority: ['lin_void_reap', 'lin_shade_step', 'lin_hollow_needle'],
  },
  passive: skill(
    'hollow_isolation',
    LN.ID,
    'Hollow Isolation',
    'passive',
    'Strikes against isolated foes deal bonus void damage.',
    'on_hit',
    'nearest_enemy',
    [atkDamage(0.8, { isolationBonus: LN.ISOLATION_DAMAGE_BONUS, isolationRadius: LN.ISOLATION_RADIUS })],
    ['damage', 'execute'],
  ),
  ultimate: skill(
    'silence_requiem',
    LN.ID,
    'Silence Requiem',
    'ultimate',
    'Blink to an isolated enemy and deliver a lethal void requiem.',
    'manual_or_auto_ultimate',
    'isolated_enemy',
    [
      { effectType: 'move_to_target' },
      atkDamage(2.8, { isolationBonus: LN.ISOLATION_DAMAGE_BONUS, isolationRadius: LN.ISOLATION_RADIUS }),
      applyStatus('vulnerable', 3000, 0.18),
    ],
    ['dash', 'damage', 'execute'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'lin_void_reap',
      LN.ID,
      'Void Reap',
      'side',
      'Execute an isolated foe with a precision void blade.',
      'cooldown',
      'isolated_enemy',
      [atkDamage(2.2, { isolationBonus: LN.ISOLATION_DAMAGE_BONUS, isolationRadius: LN.ISOLATION_RADIUS })],
      ['damage', 'execute'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'lin_shade_step',
      LN.ID,
      'Shade Step',
      'side',
      'Slip through hollow shade and strike the nearest foe.',
      'cooldown',
      'nearest_enemy',
      [
        { effectType: 'move_to_target' },
        atkDamage(1.5),
      ],
      ['dash', 'damage'],
      { cooldownMs: 7000, initialCooldownMs: 1500 },
    ),
    skill(
      'lin_hollow_needle',
      LN.ID,
      'Hollow Needle',
      'side',
      'Pierce a vulnerable target, exposing them further.',
      'cooldown',
      'lowest_hp_enemy',
      [atkDamage(1.6), applyStatus('vulnerable', 3500, 0.14)],
      ['damage', 'debuff'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Isolation strikes cut deeper.', { attack: 40 }, [
      { targetSkillId: 'hollow_isolation', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(2, 'Void Reap cooldown shortens.', { attack: 60, critChance: 0.04 }, [
      { targetSkillId: 'lin_void_reap', modifierType: 'reduce_cooldown', value: 1500 },
    ]),
    awakening(3, 'Silence Requiem gains bonus damage on isolated targets.', { attack: 85 }, [
      { targetSkillId: 'silence_requiem', modifierType: 'increase_multiplier', value: 0.30 },
    ]),
  ],
};

// ─── Wei An — Argent discipline striker ───────────────────────────────────────

const WE = HERO_NEW.WEI;

const weiKit: HeroCombatKit = {
  heroId: WE.ID,
  role: 'bruiser',
  classType: 'striker',
  element: 'iron',
  targetingProfile: { defaultTargetRule: 'nearest_enemy', fallbackTargetRule: 'frontline_enemy' },
  aiProfile: {
    ultimatePriority: 'enemy_clustered',
    sideSkillPriority: ['wei_trial_slash', 'wei_formation_edge', 'wei_iron_focus'],
  },
  passive: skill(
    'trial_discipline',
    WE.ID,
    'Trial Discipline',
    'passive',
    'Damage taken forges discipline — each hit stacks attack power.',
    'on_hit',
    'self',
    [statMod('atk_up', WE.DISCIPLINE_DURATION, WE.DISCIPLINE_STACK)],
    ['buff'],
  ),
  ultimate: skill(
    'verdict_cleave',
    WE.ID,
    'Verdict Cleave',
    'ultimate',
    'Unleash a disciplined cleave through the enemy front line.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [
      flatDamage(WE.ULTIMATE_DAMAGE),
      atkDamage(1.2),
    ],
    ['damage', 'area'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'wei_trial_slash',
      WE.ID,
      'Trial Slash',
      'side',
      'A measured slash that exposes the target.',
      'cooldown',
      'nearest_enemy',
      [atkDamage(1.9), applyStatus('vulnerable', 3000, 0.12)],
      ['damage', 'debuff'],
      { cooldownMs: 7500, initialCooldownMs: 2000 },
    ),
    skill(
      'wei_formation_edge',
      WE.ID,
      'Formation Edge',
      'side',
      'Hold the formation line with iron-hardened resolve.',
      'cooldown',
      'self',
      [statMod('damage_reduction', 5000, 0.15), statMod('atk_up', 5000, 0.10)],
      ['buff'],
      { cooldownMs: 11000, initialCooldownMs: 3000 },
    ),
    skill(
      'wei_iron_focus',
      WE.ID,
      'Iron Focus',
      'side',
      'Focus trial intent into a piercing iron strike.',
      'cooldown',
      'frontline_enemy',
      [atkDamage(2.1)],
      ['damage'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Discipline stacks hit harder.', { attack: 35 }, [
      { targetSkillId: 'trial_discipline', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
    awakening(2, 'Verdict Cleave damage increases.', { attack: 55 }, [
      { targetSkillId: 'verdict_cleave', modifierType: 'increase_multiplier', value: 0.18 },
    ]),
    awakening(3, 'Trial Slash applies brief slow on hit.', { attack: 75, hp: 150 }, [
      {
        targetSkillId: 'wei_trial_slash',
        modifierType: 'add_status',
        value: applyStatus('slow', 2000, 0.15),
      },
    ]),
  ],
};

// ─── Fen Rou — Freebound phantom support ────────────────────────────────────────

const FE = HERO_NEW.FEN;

const fenKit: HeroCombatKit = {
  heroId: FE.ID,
  role: 'support',
  classType: 'mystic',
  element: 'storm',
  targetingProfile: { defaultTargetRule: 'lowest_hp_ally', fallbackTargetRule: 'self' },
  aiProfile: {
    ultimatePriority: 'ally_low_hp',
    sideSkillPriority: ['fen_squall_mend', 'fen_wind_veil', 'fen_static_chime'],
  },
  passive: skill(
    'squall_whisper',
    FE.ID,
    'Squall Whisper',
    'passive',
    'Whispers of the squall grant allies brief haste after combat begins.',
    'combat_start',
    'all_allies',
    [statMod('haste', 3000, 0.08)],
    ['buff'],
  ),
  ultimate: skill(
    'phantom_strike',
    FE.ID,
    'Phantom Strike',
    'ultimate',
    'Grant an ally a phantom echo — they strike twice per cycle for several seconds.',
    'manual_or_auto_ultimate',
    'lowest_hp_ally',
    [statMod('haste', FE.PHANTOM_DURATION, FE.PHANTOM_HASTE)],
    ['buff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'fen_squall_mend',
      FE.ID,
      'Squall Mend',
      'side',
      'Mend the weakest ally with storm-touched healing.',
      'cooldown',
      'lowest_hp_ally',
      [flatHeal(95)],
      ['heal'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
    skill(
      'fen_wind_veil',
      FE.ID,
      'Wind Veil',
      'side',
      'Wrap an ally in wind, shielding and quickening them.',
      'cooldown',
      'lowest_hp_ally',
      [shield(80, 4000), statMod('haste', 3000, 0.12)],
      ['shield', 'buff'],
      { cooldownMs: 10000, initialCooldownMs: 3000 },
    ),
    skill(
      'fen_static_chime',
      FE.ID,
      'Static Chime',
      'side',
      'Chime static through foes, slowing the nearest enemy.',
      'cooldown',
      'nearest_enemy',
      [atkDamage(0.9), applyStatus('slow', 3000, 0.18)],
      ['damage', 'control', 'debuff'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Phantom Strike lasts longer.', { hp: 80 }, [
      { targetSkillId: 'phantom_strike', modifierType: 'increase_duration', value: 1000 },
    ]),
    awakening(2, 'Squall Mend heals more.', { hp: 120 }, [
      { targetSkillId: 'fen_squall_mend', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(3, 'Wind Veil shields grow stronger.', { hp: 160 }, [
      { targetSkillId: 'fen_wind_veil', modifierType: 'increase_multiplier', value: 0.25 },
    ]),
  ],
};

// ─── Lian Qing — Radiant judgment debuffer ────────────────────────────────────

const LI = HERO_NEW.LIAN;

const lianKit: HeroCombatKit = {
  heroId: LI.ID,
  role: 'caster',
  classType: 'oracle',
  element: 'light',
  targetingProfile: { defaultTargetRule: 'highest_atk_enemy', fallbackTargetRule: 'nearest_enemy' },
  aiProfile: {
    ultimatePriority: 'enemy_clustered',
    sideSkillPriority: ['lian_sunbrand', 'lian_expose', 'lian_radiant_lance'],
  },
  passive: skill(
    'radiant_scrutiny',
    LI.ID,
    'Radiant Scrutiny',
    'passive',
    'Basic scrutiny applies judgment marks to struck foes.',
    'on_hit',
    'nearest_enemy',
    [applyStatus('judgment_mark', LI.MARK_DURATION, LI.MARK_STACK_VULN)],
    ['debuff'],
  ),
  ultimate: skill(
    'judgment_detonate',
    LI.ID,
    'Judgment Detonate',
    'ultimate',
    'Detonate all judgment marks across the battlefield for radiant burst damage.',
    'manual_or_auto_ultimate',
    'all_enemies',
    [{
      effectType: 'detonate_status',
      statusId: 'judgment_mark',
      flatAmount: LI.DETONATE_BASE,
      scaling: { stat: 'atk', multiplier: LI.DETONATE_ATK_MULT },
    }],
    ['damage', 'area', 'debuff'],
    { energyCost: 100 },
  ),
  sideSkills: [
    skill(
      'lian_sunbrand',
      LI.ID,
      'Sunbrand',
      'side',
      'Brand an enemy with a stacking judgment mark.',
      'cooldown',
      'highest_atk_enemy',
      [atkDamage(1.3), applyStatus('judgment_mark', LI.MARK_DURATION, LI.MARK_STACK_VULN)],
      ['damage', 'debuff'],
      { cooldownMs: 7000, initialCooldownMs: 2000 },
    ),
    skill(
      'lian_expose',
      LI.ID,
      'Expose',
      'side',
      'Expose a marked foe, layering judgment and vulnerability.',
      'cooldown',
      'nearest_enemy',
      [
        applyStatus('judgment_mark', LI.MARK_DURATION, LI.MARK_STACK_VULN),
        applyStatus('vulnerable', 3000, 0.10),
      ],
      ['debuff'],
      { cooldownMs: 9000, initialCooldownMs: 2500 },
    ),
    skill(
      'lian_radiant_lance',
      LI.ID,
      'Radiant Lance',
      'side',
      'Hurl a lance of morning light through the enemy line.',
      'cooldown',
      'backline_enemy',
      [atkDamage(2.0)],
      ['damage'],
      { cooldownMs: 8000, initialCooldownMs: 2000 },
    ),
  ],
  awakeningTrack: [
    awakening(1, 'Judgment marks linger longer.', { attack: 40 }, [
      { targetSkillId: 'lian_sunbrand', modifierType: 'increase_duration', value: 1500 },
    ]),
    awakening(2, 'Detonation hits harder per mark.', { attack: 60 }, [
      { targetSkillId: 'judgment_detonate', modifierType: 'increase_multiplier', value: 0.20 },
    ]),
    awakening(3, 'Sunbrand applies an extra mark stack on cast.', { attack: 80, hp: 120 }, [
      {
        targetSkillId: 'lian_sunbrand',
        modifierType: 'add_status',
        value: applyStatus('judgment_mark', 2000, LI.MARK_STACK_VULN),
      },
    ]),
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const HERO_KITS: Record<string, HeroCombatKit> = {
  [K.ID]: kaelKit,
  [S.ID]: suraKit,
  [M.ID]: miraKit,
  [N.ID]: nyraKit,
  [R.ID]: renKit,
  [SO.ID]: solenneKit,
  [V.ID]: veyraKit,
  [T.ID]: thaneKit,
  [C.ID]: cairaKit,
  [MK.ID]: marekKit,
  [LN.ID]: linKit,
  [WE.ID]: weiKit,
  [FE.ID]: fenKit,
  [LI.ID]: lianKit,
};

export const HERO_KIT_IDS = Object.keys(HERO_KITS);

export function getHeroCombatKit(heroId: string): HeroCombatKit | undefined {
  return HERO_KITS[heroId];
}

export function getKitHeroClass(heroId: string): KitHeroClass | undefined {
  return HERO_KITS[heroId]?.classType;
}

/** Dev guard — every roster hero must have a kit definition. */
export function assertAllHeroesHaveKits(): void {
  for (const hero of HEROES_DATA) {
    if (!HERO_KITS[hero.id]) {
      throw new Error(`Missing HeroCombatKit for hero: ${hero.id}`);
    }
  }
}

if (import.meta.env.DEV) {
  assertAllHeroesHaveKits();
}
