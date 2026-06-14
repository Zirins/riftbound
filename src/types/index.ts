// src/types/index.ts
// ALL TypeScript interfaces and type aliases for Riftbound Sigils.
// Never define interfaces inline in scene, entity, or system files.

// ─── Union types ─────────────────────────────────────────────────────────────

export type HeroClass =
  | 'tank'
  | 'fighter'
  | 'assassin'
  | 'mage'
  | 'support'
  | 'ranger';

export type HeroRarity = 'uncommon' | 'rare' | 'epic' | 'legendary';
export type HeroFaction = 'argent' | 'radiant' | 'freebound' | 'hollow';

export type EnemyClass = 'melee' | 'ranged' | 'mage' | 'armored' | 'boss';

export type SigilRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'mythic'
  | 'ancient';

export type SigilElement =
  | 'flame' | 'storm' | 'frost' | 'stone'
  | 'void'  | 'light' | 'blood' | 'time'
  | 'venom' | 'lunar';

export type FormationRow = 'front' | 'back';

export type BuffType =
  | 'shield'
  | 'attackBuff'
  | 'defenseBuff'
  | 'speedBuff'
  | 'healOverTime'
  | 'energyRegen'
  | 'taunt';

export type DebuffType =
  | 'burn'
  | 'slow'
  | 'taunt'
  | 'silence'
  | 'stun'
  | 'bleed'
  | 'mark'
  | 'attackReduce'
  | 'stagger';

// ─── Static hero definition (data layer, not runtime) ────────────────────────

export interface HeroData {
  id: string;
  name: string;
  title: string;
  heroClass: HeroClass;
  rarity: HeroRarity;
  faction: HeroFaction;
  animaForm: string;
  color: number;           // Phaser hex e.g. 0x4488ff
  radius: number;          // px
  baseHP: number;
  hpPerLevel: number;
  baseAttack: number;
  attackPerLevel: number;
  baseDefense: number;
  defensePerLevel: number;
  attackCooldown: number;  // ms
  moveSpeed: number;       // px/s
  energyGainOnHit: number;
  energyGainOnTaken: number;
  passiveId: string;
  ultimateId: string;
}

// ─── Runtime hero state (in-battle, not persisted) ───────────────────────────

export interface HeroRuntimeState {
  heroId: string;
  heroClass: HeroClass;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  currentHP: number;
  maxHP: number;
  attack: number;                   // computed: level + star rank + Sigil bonuses
  defense: number;
  attackCooldown: number;           // ms, may be modified by buffs
  attackRange: number;              // px — melee reach; ranged heroes still fire projectiles
  moveSpeed: number;
  currentEnergy: number;
  isAlive: boolean;
  attackCooldownRemaining: number;  // ms countdown
  healCooldownRemaining: number;    // ms — support passive heal timer (Mira)
  ultimateReady: boolean;
  attackCounter: number;            // tracks Nth-hit passive triggers
  activeBuffs: ActiveBuff[];
  activeDebuffs: ActiveDebuff[];
}

export interface ActiveBuff {
  id: string;
  type: BuffType;
  value: number;
  durationRemaining: number;  // ms
}

export interface ActiveDebuff {
  id: string;
  type: DebuffType;
  value: number;
  durationRemaining: number;  // ms
}

// ─── Hero persistence / progression (v1.1+, typed now for SaveData) ──────────

export interface HeroOwnershipState {
  heroId: string;
  isOwned: boolean;
  starRank: number;          // 1–5
  level: number;             // 1–60
  currentXP: number;
  shardCount: number;
  equippedSigilIds: string[];  // max 2 in MVP, 6 post-MVP
  acquiredAt?: number;       // timestamp ms — V1.1
}

// ─── Formation ───────────────────────────────────────────────────────────────

export interface FormationSlot {
  slotIndex: number;         // 0–3 for 2×2 MVP
  row: FormationRow;
  col: number;               // 0 = left column, 1 = right column
  assignedHeroId: string | null;
}

export interface FormationGrid {
  slots: FormationSlot[];    // 4 elements for V0.1
}

/** Selected heroes passed from lineup to battle — order is not combat placement. */
export interface HeroLineupEntry {
  heroId: string;
  heroClass: HeroClass;
}

// ─── Enemy ───────────────────────────────────────────────────────────────────

export interface EnemyData {
  id: string;
  name: string;
  enemyClass: EnemyClass;
  maxHP: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  attackCooldown: number;    // ms
  attackRange: number;       // px
  radius: number;
  color: number;
  isBoss: boolean;
}

export type EnemyTargetingRule =
  | 'nearest'
  | 'lowest_hp_backline'
  | 'frontline_tank';

export interface EnemyBossTraits {
  silenceImmune?: boolean;
  stunDurationMultiplier?: number;
  knockbackImmune?: boolean;
}

export interface EnemyRuntimeState {
  enemyId: string;
  instanceId: string;        // unique per in-battle instance (e.g. 'rift_grunt_0')
  x: number;
  y: number;
  currentHP: number;
  maxHP: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  attackCooldown: number;
  attackRange: number;         // px
  radius: number;
  isAlive: boolean;
  attackCooldownRemaining: number;
  activeDebuffs: ActiveDebuff[];
  targetingRule?: EnemyTargetingRule;
  dodgeChance?: number;
  basicAttackDamageReduction?: number;
  basicAttackMultiplier?: number;
  isBoss?: boolean;
  bossTraits?: EnemyBossTraits;
}

// ─── Skills / Ultimates ──────────────────────────────────────────────────────

export interface SkillData {
  id: string;
  name: string;
  description: string;
  triggerCondition:
    | 'passive_nth_attack'
    | 'passive_interval'
    | 'passive_hp_threshold'
    | 'on_kill'
    | 'ultimate';
  nthHitCount?: number;
  intervalMs?: number;
  hpThresholdPercent?: number;
  effectType:
    | 'damage'
    | 'aoe_damage'
    | 'heal'
    | 'aoe_heal'
    | 'buff'
    | 'debuff'
    | 'projectile_burst';
  effectValue: number;
  effectRadius?: number;   // px
  effectDuration?: number; // ms
  targetType:
    | 'self'
    | 'ally_lowest_hp'
    | 'all_allies'
    | 'nearest_enemy'
    | 'all_enemies'
    | 'front_enemies'
    | 'backline_enemy'
    | 'cluster_enemy';
}

// ─── Wave configuration ───────────────────────────────────────────────────────

export interface WaveConfig {
  waveIndex: number;
  enemies: { enemyId: string; count: number }[];
  isBossWave: boolean;
  statScale?: number;
}

// ─── Campaign stages (V1.1) ───────────────────────────────────────────────────

export interface StageRewardConfig {
  gold: { min: number; max: number };
  crystals: number;
  xpFragments: number;
  shardDrops?: { heroId: string; chance: number }[];
  sigilDrop?: { chance: number; rarity: EquipmentSigilRarity };
  firstClearItems?: { itemId: string; quantity: number }[];
}

export interface StageData {
  id: string;
  name: string;
  chapterId: string;
  energyCost: number;
  waves: WaveConfig[];
  rewards: StageRewardConfig;
  unlockCondition: string | null;
}

export interface BattlePerformance {
  heroesThatDied: number;
  clearTimeMs: number;
  wavesCleared: number;
}

export interface StageReward {
  stageId: string;
  stars: number;
  gold: number;
  crystals: number;
  xpFragments: number;
  clearTimeMs: number;
  shardGrants: { heroId: string; amount: number }[];
  sigilGrants: { sigilDefinitionId: string; level: number }[];
  firstClearItemGrants: { itemId: string; quantity: number }[];
}

// ─── Sigil (v1.2+, typed now for inventory) ──────────────────────────────────

export interface SigilData {
  id: string;
  name: string;
  rarity: SigilRarity;
  element: SigilElement;
  description: string;
  level: number;
  maxLevel: number;
  statBonuses: {
    hp?: number;
    hpPercent?: number;
    attack?: number;
    attackPercent?: number;
    defense?: number;
    defensePercent?: number;
    attackSpeedPercent?: number;
    energyGain?: number;
  };
  passiveEffectId?: string;
}

// ─── Gacha / Summon (v1.1+, typed now for SaveData) ─────────────────────────

export interface BannerData {
  id: string;
  name: string;
  description: string;
  heroPool: SummonPoolItem[];
  costPerPull: number;
  guaranteeAt: number;
  softPityStart: number;
  isActive: boolean;
  expiresAt?: number;  // unix timestamp — undefined for permanent banners
}

export interface SummonPoolItem {
  heroId: string;
  rarity: HeroRarity;
  weight: number;      // relative probability weight
  isFeatured: boolean;
}

export interface SummonResult {
  heroId: string;
  rarity: HeroRarity;
  isNew: boolean;
  shardsGranted: number;  // 0 if isNew, shard value if duplicate
}

// ─── Player inventory / save data ────────────────────────────────────────────

export interface PlayerInventory {
  gold: number;
  riftCrystals: number;
  sigilDust: number;
  ownedSigilIds: string[];
  ownedHeroes: HeroOwnershipState[];
}

export interface SaveData {
  accountLevel: number;
  accountXP: number;
  inventory: PlayerInventory;
  clearedStages: string[];
  currentFormation: FormationGrid;
  pityCounters: { [bannerId: string]: number };
  settings: {
    musicVolume: number;
    sfxVolume: number;
    defaultAutoUltimate: boolean;
  };
  lastSaved: number;  // unix timestamp
}

// ─── Runtime battle state (not persisted) ────────────────────────────────────

export interface GameState {
  currentStageId: string;
  currentWaveIndex: number;
  heroes: HeroRuntimeState[];
  enemies: EnemyRuntimeState[];
  autoUltimate: boolean;
  isPaused: boolean;
  isVictory: boolean;
  isDefeat: boolean;
  elapsedTimeMs: number;
  firstHeroToFall: string | null;
}

// ─── V1.1 Save Root ───────────────────────────────────────────────────────────

export interface SaveRoot {
  schemaVersion: number;         // 2 for V1.1, 3 for V2
  realms: Record<string, RealmSaveData>;
  selectedRealmId: string | null;
}

export interface RealmSaveData {
  realmId: string;
  playerName: string;
  avatarColorIndex: number;
  accountLevel: number;
  accountXP: number;
  resonanceTier: number;         // 1–10
  inventory: PlayerInventoryV2;
  ownedHeroes: HeroOwnershipState[];
  currentFormation: FormationGrid;
  clearedStages: ClearedStageRecord[];
  pityCounters: Record<string, number>;   // bannerId → pull count since last legendary
  arenaState: ArenaState;
  riftChronicle: RiftChronicleState;
  tasks: DailyTaskState[];
  mail: MailMessage[];
  dailyShopState: DailyShopState;
  lastFreeSummonDate: string;    // 'YYYY-MM-DD' — daily free summon tracking
  settings: GameSettingsV11;
  lastSaved: number;
}

export interface PlayerInventoryV2 {
  gold: number;
  riftCrystals: number;
  voidGems: number;              // reserved — V2 IAP premium currency. DO NOT render in V1.1 UI.
  xpFragments: number;
  energy: number;
  maxEnergy: number;
  lastEnergyRegenAt: number;     // timestamp ms
  ownedSigilIds: string[];
  heroShards: Record<string, number>;   // heroId → shard count
}

export interface ClearedStageRecord {
  stageId: string;
  stars: number;                 // 1–3
  bestClearTimeMs: number;
  firstClearedAt: number;        // timestamp
}

export interface ArenaState {
  rankPoints: number;
  rankTier: string;              // 'rift_initiate' | 'rift_adept' | etc.
  attemptsUsedToday: number;
  lastAttemptResetDate: string;  // 'YYYY-MM-DD'
  lastRewardClaimDate: string;
  defenseFormation: FormationGrid;
}

export interface ArenaMatchResult {
  win: boolean;
  rankPointsDelta: number;
  newRankPoints: number;
  newTier: string;
  rewardGold: number;
  rewardCrystals: number;
}

export interface RiftChronicleState {
  currentStreak: number;         // days claimed in current run
  lastClaimDate: string;         // 'YYYY-MM-DD'
  totalDaysClaimed: number;
}

export interface DailyTaskState {
  taskId: string;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
  date: string;                  // 'YYYY-MM-DD' — used to detect daily reset
}

export interface MailMessage {
  id: string;
  fromName: string;
  subject: string;
  body: string;
  attachments: MailAttachment[];
  isRead: boolean;
  isClaimed: boolean;
  sentAt: number;
  expiresAt: number | null;
}

export interface MailAttachment {
  type: 'gold' | 'crystals' | 'xpFragments' | 'shards' | 'energy';
  heroId?: string;               // only for 'shards' type
  amount: number;
}

export interface DailyShopState {
  date: string;                  // 'YYYY-MM-DD'
  purchasedItemIds: string[];
}

export interface GameSettingsV11 {
  musicVolume: number;           // 0–100
  sfxVolume: number;
  defaultAutoUltimate: boolean;
}

// ─── V2 Core Type Contracts (Section 8) ───────────────────────────────────────

export type CurrencyType =
  | 'gold'
  | 'rift_crystal'
  | 'void_gem'
  | 'energy'
  | 'arena_coin'
  | 'covenant_coin'
  | 'friendship_point';

export type InventoryItemType =
  | 'xp_fragment'
  | 'sigil_dust'
  | 'awakening_crystal'
  | 'hero_shard'
  | 'sigil_box'
  | 'reward_box'
  | 'event_item'
  | 'material';

export type RewardSource =
  | 'campaign_clear'
  | 'campaign_sweep'
  | 'daily_task'
  | 'weekly_task'
  | 'achievement'
  | 'rift_chronicle'
  | 'offline_reward'
  | 'arena_match'
  | 'arena_season'
  | 'void_trial'
  | 'covenant_contribution'
  | 'covenant_boss'
  | 'covenant_shop'
  | 'friend_gift'
  | 'rift_season'
  | 'gacha_pull'
  | 'iap_purchase'
  | 'dev_grant';

export interface CurrencyReward {
  type: CurrencyType;
  amount: number;
}

export interface ItemReward {
  itemId: string;
  quantity: number;
}

export interface HeroShardReward {
  heroId: string;
  quantity: number;
}

export interface HeroReward {
  heroId: string;
  duplicateShardQuantity?: number;
}

export interface SigilReward {
  sigilDefinitionId: string;
  rarityOverride?: EquipmentSigilRarity;
  level?: number;
}

export interface RewardBundle {
  source: RewardSource;
  currencies?: CurrencyReward[];
  items?: ItemReward[];
  heroShards?: HeroShardReward[];
  heroes?: HeroReward[];
  sigils?: SigilReward[];
  mailAttachments?: RewardBundle[];
}

export interface GrantResult {
  success: boolean;
  grantedBundle: RewardBundle;
  errors?: string[];
}

export interface RewardPreview {
  bundle: RewardBundle;
  wouldGrantNewHeroes: string[];
}

export type SpendReason = string;

export interface CurrencyCost {
  type: CurrencyType;
  amount: number;
}

export interface SpendResult {
  success: boolean;
  reason?: string;
}

export interface ItemCost {
  itemId: string;
  quantity: number;
}

export interface UseItemContext {
  heroId?: string;
}

export interface UseItemResult {
  success: boolean;
  reason?: string;
  rewardsGranted?: RewardBundle;
}

export type GameEvent =
  | { type: 'stage_cleared'; stageId: string; stars: number; swept: boolean }
  | { type: 'arena_won'; opponentId: string }
  | { type: 'hero_summoned'; heroId: string; rarity: HeroRarity; duplicate: boolean }
  | { type: 'hero_star_up'; heroId: string; newStar: number }
  | { type: 'hero_awakened'; heroId: string; awakeningLevel: number }
  | { type: 'sigil_upgraded'; sigilId: string; newLevel: number }
  | { type: 'sigil_dissolved'; sigilId: string; rarity: SigilRarity }
  | { type: 'covenant_joined'; covenantId: string }
  | { type: 'covenant_contributed'; amount: number; currency: CurrencyType }
  | { type: 'friend_gift_sent'; friendId: string }
  | { type: 'rift_season_tier_claimed'; tier: number };

export interface ResetResult {
  dailyResetApplied: boolean;
  weeklyResetApplied: boolean;
  dailyDateKey: string;
  weeklyWeekKey: string;
  handlersRun: string[];
}

// ─── V2 Save Schema V3 (Section 7) ──────────────────────────────────────────

/** V1.1 realm save — alias for migration contracts. */
export type RealmSaveDataV2 = RealmSaveData;

export interface PlayerInventoryV3 extends PlayerInventoryV2 {
  itemQuantities: Record<string, number>;
  arenaCoins: number;
  covenantCoins: number;
  friendshipPoints: number;
}

export type EquipmentSigilRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface SigilStatRoll {
  statType: SigilStatType;
  value: number;
}

export type SigilStatType =
  | 'hp'
  | 'hpPercent'
  | 'attack'
  | 'attackPercent'
  | 'defense'
  | 'defensePercent'
  | 'attackSpeedPercent'
  | 'energyGain';

export interface SigilStatDefinition {
  statType: SigilStatType;
  value: number;
}

export interface SigilPassiveModifier {
  passiveEffectId: string;
  value: number;
}

export type SigilDropSource =
  | 'campaign'
  | 'void_trial'
  | 'covenant_boss'
  | 'shop'
  | 'gacha'
  | 'dev_grant';

export interface SigilDefinition {
  id: string;
  name: string;
  rarity: EquipmentSigilRarity;
  element: ElementType;
  primaryStat: SigilStatDefinition;
  secondaryStatPool: SigilStatType[];
  passiveModifier?: SigilPassiveModifier;
  dropSources: SigilDropSource[];
}

export interface OwnedSigil {
  instanceId: string;
  definitionId: string;
  level: number;
  breakthroughLevel: 0 | 1 | 2 | 3;
  secondaryStats: SigilStatRoll[];
  equippedHeroId?: string;
  equippedSlotIndex?: 0 | 1;
}

export interface SigilOwnershipState {
  ownedSigils: OwnedSigil[];
  nextInstanceId: number;
}

export interface HeroAwakeningState {
  heroId: string;
  awakeningLevel: 0 | 1 | 2 | 3;
}

export interface BondState {
  activatedBondIds: string[];
}

export type BondType = 'faction' | 'class' | 'collection' | 'pair';

export interface GlobalStatModifiers {
  hp?: number;
  attack?: number;
  defense?: number;
  hpPercent?: number;
  attackPercent?: number;
  defensePercent?: number;
}

export interface ActiveBond {
  bondId: string;
  type: BondType;
  name: string;
  description: string;
  tier: number;
  currentCount: number;
  requiredCount: number;
  isActive: boolean;
  contributesGlobally: boolean;
  modifiers: GlobalStatModifiers;
}

export interface AchievementSaveState {
  completedAchievementIds: string[];
  claimedAchievementIds: string[];
}

export interface WeeklyTaskEntry {
  taskId: string;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
}

export interface WeeklyTaskSaveState {
  weekKey: string;
  tasks: WeeklyTaskEntry[];
}

export interface OfflineRewardState {
  lastClaimAt: number;
  pendingGold: number;
  pendingXpFragments: number;
  pendingEnergy: number;
}

export interface CovenantBossState {
  bossId: string;
  currentHp: number;
  maxHp: number;
  attemptsUsedThisWeek: number;
  lastWeeklyResetWeekKey: string;
  defeatedThisWeek: boolean;
}

export interface CovenantShopState {
  weekKey: string;
  purchasedItemCounts: Record<string, number>;
}

export interface CovenantState {
  covId: string | null;
  covName: string | null;
  covLevel: number;
  covXP: number;
  memberCount: number;
  members: CovenantMember[];
  personalContributionToday: number;
  lastContributionDate: string;
  covCoins: number;
  bossState: CovenantBossState;
  shopState: CovenantShopState;
}

export interface CovenantMember {
  id: string;
  name: string;
  role: 'leader' | 'member' | 'npc';
  resonancePower: number;
  lastActiveText: string;
  weeklyContribution: number;
}

export interface FriendState {
  friendIds: string[];
  sentGiftToday: string[];
  receivedGiftToday: string[];
  friendshipPoints: number;
  lastGiftResetDate: string;
  shopPurchasesThisWeek: Record<string, number>;
  lastShopResetWeekKey: string;
}

export interface PatronState {
  patronPoints: number;
  patronTier: number;
  dailyGiftClaimedDate: string;
}

export interface RiftSeasonState {
  seasonId: string;
  seasonStartDate: string;
  seasonEndDate: string;
  currentXp: number;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  premiumUnlocked: boolean;
}

export interface FeaturedBannerState {
  currentBannerId: string;
  bannerStartDate: string;
  bannerEndDate: string;
  pityCounter: number;
  guaranteedFeatured: boolean;
  totalPullsOnCurrentBanner: number;
}

export interface VoidTrialState {
  highestFloorCleared: number;
  firstClearClaimedFloors: number[];
  attemptsUsedToday: number;
  lastAttemptResetDate: string;
  lastWeeklyRewardWeekKey: string;
  weeklyHighestFloor: number;
}

export interface MonetizationState {
  foundersPackClaimed: boolean;
  monthlyCardActiveUntil: string | null;
  monthlyCardDailyClaimsRemaining: number;
  growthFundPurchased: boolean;
  growthFundClaimedMilestones: number[];
  testPurchaseHistory: string[];
}

export interface WorldFeedState {
  dateKey: string;
  messageSeed: number;
  displayedIndex: number;
}

export interface ResetState {
  lastDailyResetDate: string;
  lastWeeklyResetWeekKey: string;
  lastSeasonId: string;
}

export interface FormationPreset {
  id: string;
  name: string;
  mode?: 'campaign' | 'arena' | 'boss' | 'custom';
  slots: FormationSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface FormationPresetResult {
  success: boolean;
  reason?: string;
  preset?: FormationPreset;
}

export interface RealmSaveDataV3 extends RealmSaveData {
  inventory: PlayerInventoryV3;
  sigilState: SigilOwnershipState;
  awakeningState: Record<string, HeroAwakeningState>;
  bondState: BondState;
  formationPresets: FormationPreset[];
  achievementState: AchievementSaveState;
  weeklyTaskState: WeeklyTaskSaveState;
  offlineRewardState: OfflineRewardState;
  covenantState: CovenantState;
  friendState: FriendState;
  patronState: PatronState;
  riftSeasonState: RiftSeasonState;
  featuredBannerState: FeaturedBannerState;
  voidTrialState: VoidTrialState;
  monetizationState: MonetizationState;
  worldFeedState: WorldFeedState;
  resetState: ResetState;
}

// ─── V2 Hero Combat Kit (Section 11) ──────────────────────────────────────────

export type HeroRole =
  | 'frontline_tank'
  | 'bruiser'
  | 'assassin'
  | 'ranged_dps'
  | 'caster'
  | 'support'
  | 'healer'
  | 'controller'
  | 'summoner';

/** V2 kit class axis — distinct from V1.1 HeroClass combat roles. */
export type KitHeroClass =
  | 'vanguard'
  | 'striker'
  | 'mystic'
  | 'warden'
  | 'oracle';

export type ElementType =
  | 'iron'
  | 'flame'
  | 'storm'
  | 'frost'
  | 'stone'
  | 'void'
  | 'light'
  | 'blood'
  | 'time'
  | 'venom'
  | 'lunar';

export type SkillType = 'passive' | 'ultimate' | 'side';

export type SkillTrigger =
  | 'always_on'
  | 'combat_start'
  | 'cooldown'
  | 'energy_full'
  | 'manual_or_auto_ultimate'
  | 'on_hit'
  | 'on_crit'
  | 'on_kill'
  | 'on_death'
  | 'on_revive'
  | 'on_ally_low_hp'
  | 'after_seconds'
  | 'on_status_applied';

export type TargetRule =
  | 'nearest_enemy'
  | 'lowest_hp_enemy'
  | 'highest_atk_enemy'
  | 'backline_enemy'
  | 'frontline_enemy'
  | 'densest_enemy_cluster'
  | 'random_enemy'
  | 'self'
  | 'lowest_hp_ally'
  | 'all_allies'
  | 'all_enemies'
  | 'area_forward_box'
  | 'area_circle';

export type SkillTag =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'summon'
  | 'dash'
  | 'buff'
  | 'debuff'
  | 'control'
  | 'execute'
  | 'revive'
  | 'lifesteal'
  | 'energy_gain'
  | 'damage_over_time'
  | 'area';

export interface HeroStats {
  hp: number;
  attack: number;
  defense: number;
  hpPercent?: number;
  attackPercent?: number;
  defensePercent?: number;
  attackSpeed?: number;
  attackSpeedPercent?: number;
  critChance?: number;
  critDamage?: number;
  dodgeChance?: number;
  energyGain?: number;
}

export interface TargetingProfile {
  defaultTargetRule: TargetRule;
  fallbackTargetRule?: TargetRule;
}

export interface HeroAIProfile {
  ultimatePriority:
    | 'asap'
    | 'execute'
    | 'ally_low_hp'
    | 'enemy_clustered'
    | 'boss_only'
    | 'manual_preferred';
  sideSkillPriority: string[];
  allowedAutoSkills?: string[];
  restrictedAutoSkills?: string[];
}

export interface AreaDefinition {
  shape: 'circle' | 'box' | 'cone' | 'line';
  radius?: number;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface SkillEffect {
  effectType:
    | 'damage'
    | 'heal'
    | 'shield'
    | 'apply_status'
    | 'remove_status'
    | 'summon_unit'
    | 'move_to_target'
    | 'gain_energy'
    | 'revive'
    | 'stat_modifier';
  scaling?: {
    stat: 'atk' | 'maxHp' | 'def' | 'currentHpMissing';
    multiplier: number;
  };
  flatAmount?: number;
  durationMs?: number;
  statusId?: string;
  summonId?: string;
  maxTargets?: number;
  area?: AreaDefinition;
}

export interface HeroSkill {
  id: string;
  heroId: string;
  name: string;
  type: SkillType;
  description: string;
  trigger: SkillTrigger;
  cooldownMs?: number;
  initialCooldownMs?: number;
  energyCost?: number;
  targetRule: TargetRule;
  effects: SkillEffect[];
  tags: SkillTag[];
}

export interface SkillModifier {
  targetSkillId: string;
  modifierType:
    | 'increase_multiplier'
    | 'increase_duration'
    | 'add_status'
    | 'add_effect'
    | 'reduce_cooldown'
    | 'increase_target_count'
    | 'upgrade_summon';
  value: number | string | SkillEffect;
}

export interface AwakeningLevelData {
  level: 1 | 2 | 3;
  requiredStarRank: 5;
  costs: {
    gold: number;
    awakeningCrystals: number;
  };
  statBonuses: Partial<HeroStats>;
  skillModifiers: SkillModifier[];
  description: string;
}

export interface HeroCombatKit {
  heroId: string;
  role: HeroRole;
  classType: KitHeroClass;
  element: ElementType;
  targetingProfile: TargetingProfile;
  aiProfile: HeroAIProfile;
  passive: HeroSkill;
  ultimate: HeroSkill;
  sideSkills: [HeroSkill, HeroSkill, HeroSkill];
  awakeningTrack: [AwakeningLevelData, AwakeningLevelData, AwakeningLevelData];
}

// ─── V2 Status Effects (Section 13.3) ─────────────────────────────────────────

export type StatusEffectId =
  | 'stun'
  | 'silence'
  | 'wound'
  | 'burn'
  | 'shielded'
  | 'haste'
  | 'slow'
  | 'vulnerable'
  | 'damage_reduction'
  | 'atk_up'
  | 'def_up';

export interface StatusEffectDefinition {
  id: StatusEffectId;
  name: string;
  description: string;
  isDebuff: boolean;
  maxStacks?: number;
}

export interface RuntimeStatusEffect {
  id: string;
  statusId: StatusEffectId;
  value: number;
  durationRemainingMs: number;
  stacks: number;
  sourceHeroId?: string;
}

// ─── V2 Runtime Battle State (Section 13 — not persisted) ─────────────────────

export interface RuntimeSkillCooldown {
  skillId: string;
  remainingMs: number;
  totalCooldownMs: number;
}

export interface RuntimeHeroKit {
  kit: HeroCombatKit;
  awakeningLevel: 0 | 1 | 2 | 3;
  cooldowns: RuntimeSkillCooldown[];
}

export interface BattleHero extends HeroRuntimeState {
  runtimeKit: RuntimeHeroKit;
  v2StatusEffects: RuntimeStatusEffect[];
}

export interface BattleEnemy extends EnemyRuntimeState {
  v2StatusEffects: RuntimeStatusEffect[];
}

export interface BattleState {
  heroes: BattleHero[];
  enemies: BattleEnemy[];
  elapsedTimeMs: number;
}

export type BattleUnitSide = 'hero' | 'enemy';

export type BattleUnitRef =
  | { side: 'hero'; unit: BattleHero }
  | { side: 'enemy'; unit: BattleEnemy };

export type BattleEventType =
  | 'combat_start'
  | 'on_hit'
  | 'on_crit'
  | 'on_kill'
  | 'on_death'
  | 'on_revive'
  | 'on_ally_low_hp'
  | 'on_status_applied';

export interface BattleEvent {
  type: BattleEventType;
  sourceHeroId?: string;
  targetUnitId?: string;
  targetSide?: BattleUnitSide;
  statusId?: StatusEffectId;
}

export interface SkillEffectResult {
  effectType: SkillEffect['effectType'];
  targetUnitId: string;
  targetSide: BattleUnitSide;
  amount?: number;
  statusId?: StatusEffectId;
  blocked?: boolean;
}

export interface SkillCastResult {
  success: boolean;
  skillId: string;
  casterHeroId: string;
  reason?: string;
  targets: { unitId: string; side: BattleUnitSide }[];
  effects: SkillEffectResult[];
}

export interface AwakeningCost {
  gold: number;
  awakeningCrystals: number;
}

export interface AwakeningResult {
  success: boolean;
  newLevel: 0 | 1 | 2 | 3;
  reason?: string;
}

export interface EquipResult {
  success: boolean;
  reason?: string;
}

export interface SigilUpgradeResult {
  success: boolean;
  newLevel?: number;
  newBreakthroughLevel?: 0 | 1 | 2 | 3;
  reason?: string;
}

export interface SigilDissolveResult {
  success: boolean;
  dustGranted?: number;
  reason?: string;
}
