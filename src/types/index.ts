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
  schemaVersion: number;         // 2 for V1.1
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
