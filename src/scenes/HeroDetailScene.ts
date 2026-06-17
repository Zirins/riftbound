// src/scenes/HeroDetailScene.ts
// Full hero profile — stats, RP, level up, star up, dissolve, and awakening.

import Phaser from 'phaser';
import {
  AWAKENING,
  CANVAS,
  DISSOLVE_SHARDS,
  UI,
} from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import {
  AWAKENING_CRYSTAL_ITEM_ID,
  formatSkillModifier,
  getAwakeningLevelData,
} from '../data/awakeningData';
import { getHeroCombatKit } from '../data/heroKits';
import { FACTION_LABELS, HEROES_DATA } from '../data/heroes';
import { AwakeningSystem, awakenHero } from '../systems/AwakeningSystem';
import { canAfford, EconomySystem } from '../systems/EconomySystem';
import {
  computeHeroStats,
  computeRP,
  getLevelCap,
  getLevelUpCost,
  levelUp,
} from '../systems/HeroProgressionSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { dissolve, getStarUpCost, getTotalShards, starUp } from '../systems/ShardSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { HERO_SIGIL_SLOT_ROW_EXTENT_Y, HeroSigilSlotRow } from '../ui/HeroSigilSlotRow';
import { HubOverlayPanel } from '../ui/HubOverlayPanel';
import { ProgressBar } from '../ui/ProgressBar';
import { StarRating } from '../ui/StarRating';
import type { HeroData, HeroOwnershipState, RealmSaveDataV3 } from '../types';

type HeroDetailTab = 'overview' | 'awakening';

const CLASS_LABELS: Record<HeroData['heroClass'], string> = {
  tank: 'Tank',
  fighter: 'Fighter',
  assassin: 'Assassin',
  mage: 'Mage',
  support: 'Support',
  ranger: 'Ranger',
};

const PASSIVE_LABELS: Record<string, string> = {
  iron_taunt: 'Iron Taunt — every 5th attack taunts target (2s)',
  ember_cleave: 'Ember Cleave — every 5th attack hits all nearby enemies',
  lantern_pulse: 'Lantern Pulse — heals lowest-HP ally on cooldown',
  void_echo: 'Void Echo — 25% chance to fire a bonus arrow',
  veilstep: 'Veilstep — every 4th attack marks lowest-HP enemy (+20% dmg)',
  arc_flare: 'Arc Flare — auto-attacks splash 30% damage nearby',
  hollow_glare: 'Hollow Glare — periodic attack reduction pulse',
  rootguard: 'Rootguard — stacking defense when hit',
  dawn_mercy: 'Dawn Mercy — heals lowest-HP ally; doubles below 30% HP',
  gathering_squall: 'Gathering Squall — consecutive attacks boost attack',
  ember_counter: 'Ember Counter — every 3 hits taken builds Ember Charges (+4% ATK each)',
};

const ULTIMATE_LABELS: Record<string, string> = {
  iron_pulse: 'Iron Pulse — AoE shield burst',
  solar_rend: 'Solar Rend — horizontal burn slash',
  rift_bloom: 'Rift Bloom — team heal + debuff cleanse',
  void_barrage: 'Void Barrage — 8-arrow rapid fire',
  quietus_dash: 'Quietus Dash — dash critical strike',
  sunthread_burst: 'Sunthread Burst — arc line + slow',
  mirror_hex: 'Mirror Hex — AoE damage + damage reduction hex',
  ironbark_stand: 'Ironbark Stand — mass taunt + shield',
  veil_of_morning: 'Veil of Morning — team heal + shields',
  stormreign_cleave: 'Stormreign Cleave — front-row devastating cleave',
  flame_eruption: 'Flame Eruption — consume Ember Charges for AoE flame burst',
};

const TAB_WIDTH = 140;
const TAB_HEIGHT = 28;
const TAB_GAP = 8;

/** Overview tab vertical layout — stats → passive/ultimate → sigils → progression. */
const OVERVIEW_STATS_Y = 182;
const OVERVIEW_PASSIVE_Y = 222;
const OVERVIEW_ULTIMATE_Y = 242;
const OVERVIEW_SIGILS_Y = 272;
const OVERVIEW_SIGIL_PROGRESS_GAP = 14;
const OVERVIEW_PROGRESS_DIVIDER_Y =
  OVERVIEW_SIGILS_Y + HERO_SIGIL_SLOT_ROW_EXTENT_Y + OVERVIEW_SIGIL_PROGRESS_GAP;
const OVERVIEW_XP_LABEL_Y = OVERVIEW_PROGRESS_DIVIDER_Y + 6;
const OVERVIEW_XP_BAR_Y = OVERVIEW_XP_LABEL_Y + 8;
const OVERVIEW_ACTION_BUTTON_Y = CANVAS.HEIGHT - 8;

export class HeroDetailScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HERO_DETAIL;

  private heroId = '';
  private activeTab: HeroDetailTab = 'overview';

  private backButton: ButtonPrimary | null = null;
  private dissolveButton: ButtonPrimary | null = null;
  private levelUpButton: ButtonPrimary | null = null;
  private starUpButton: ButtonPrimary | null = null;
  private awakenButton: ButtonPrimary | null = null;
  private sigilSlotRow: HeroSigilSlotRow | null = null;
  private starRating: StarRating | null = null;
  private xpBar: ProgressBar | null = null;
  private dissolveModal: HubOverlayPanel | null = null;

  private portrait: Phaser.GameObjects.Arc | null = null;
  private readonly statTexts: Phaser.GameObjects.Text[] = [];
  private readonly awakeningTexts: Phaser.GameObjects.Text[] = [];
  private readonly tabBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private readonly tabLabels: Phaser.GameObjects.Text[] = [];
  private readonly tabZones: Phaser.GameObjects.Zone[] = [];
  private rpLabel: Phaser.GameObjects.Text | null = null;
  private levelLabel: Phaser.GameObjects.Text | null = null;
  private shardLabel: Phaser.GameObjects.Text | null = null;
  private xpLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: HeroDetailScene.KEY });
  }

  init(data: { heroId?: string; tab?: HeroDetailTab }): void {
    this.heroId = data.heroId ?? '';
    this.activeTab = data.tab ?? 'overview';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const heroData = HEROES_DATA.find((hero) => hero.id === this.heroId);
    const realm = loadCurrentRealm();
    const ownership = realm?.ownedHeroes.find(
      (hero) => hero.heroId === this.heroId && hero.isOwned,
    ) ?? null;

    if (!heroData || !ownership || !realm) {
      this.scene.start(SCENE_KEYS.ROSTER);
      return;
    }

    const save = realm as RealmSaveDataV3;
    this.renderChrome(heroData, ownership, save);
    if (this.activeTab === 'overview') {
      this.renderOverviewTab(heroData, ownership, save);
    } else {
      this.renderAwakeningTab(heroData, ownership, save);
    }
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    this.dissolveModal?.close();
    this.dissolveModal?.destroy();
    this.dissolveModal = null;

    this.backButton?.destroy();
    this.dissolveButton?.destroy();
    this.levelUpButton?.destroy();
    this.starUpButton?.destroy();
    this.awakenButton?.destroy();
    this.sigilSlotRow?.destroy();
    this.backButton = null;
    this.dissolveButton = null;
    this.levelUpButton = null;
    this.starUpButton = null;
    this.awakenButton = null;
    this.sigilSlotRow = null;

    this.starRating?.destroy();
    this.xpBar?.destroy();
    this.starRating = null;
    this.xpBar = null;

    this.portrait?.destroy();
    this.portrait = null;
    this.rpLabel?.destroy();
    this.levelLabel?.destroy();
    this.shardLabel?.destroy();
    this.xpLabel?.destroy();
    this.rpLabel = null;
    this.levelLabel = null;
    this.shardLabel = null;
    this.xpLabel = null;

    for (const text of this.statTexts) text.destroy();
    this.statTexts.length = 0;

    for (const text of this.awakeningTexts) text.destroy();
    this.awakeningTexts.length = 0;

    for (const zone of this.tabZones) {
      zone.removeAllListeners();
      zone.destroy();
    }
    this.tabZones.length = 0;
    for (const bg of this.tabBackgrounds) bg.destroy();
    this.tabBackgrounds.length = 0;
    for (const label of this.tabLabels) label.destroy();
    this.tabLabels.length = 0;
  }

  private renderChrome(
    heroData: HeroData,
    _ownership: HeroOwnershipState,
    save: RealmSaveDataV3,
  ): void {
    const dissolveYield = DISSOLVE_SHARDS[heroData.rarity];

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← BACK',
      () => this.scene.start(SCENE_KEYS.ROSTER),
      110,
    );

    this.dissolveButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 130,
      32,
      `DISSOLVE (${dissolveYield} shards)`,
      () => this.openDissolveModal(dissolveYield),
      220,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, `${heroData.name.toUpperCase()} — ${heroData.title}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderTabBar(save);
  }

  private renderTabBar(save: RealmSaveDataV3): void {
    const tabs: { id: HeroDetailTab; label: string }[] = [
      { id: 'overview', label: 'OVERVIEW' },
      { id: 'awakening', label: 'AWAKENING' },
    ];
    const startX = CANVAS.WIDTH / 2 - (tabs.length * TAB_WIDTH + (tabs.length - 1) * TAB_GAP) / 2;

    tabs.forEach((tab, index) => {
      const x = startX + index * (TAB_WIDTH + TAB_GAP) + TAB_WIDTH / 2;
      const y = 64;
      const isSelected = this.activeTab === tab.id;
      const unlocked = tab.id !== 'awakening' || AwakeningSystem.isUnlocked(save, this.heroId);

      const bg = this.add.rectangle(x, y, TAB_WIDTH, TAB_HEIGHT, isSelected ? 0x334466 : 0x222233)
        .setStrokeStyle(1, isSelected ? 0x6688aa : 0x444466);
      const label = this.add.text(x, y, tab.label, {
        fontSize: '10px',
        color: unlocked ? (isSelected ? '#ffffff' : '#aaaaaa') : '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = this.add.zone(x, y, TAB_WIDTH, TAB_HEIGHT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (this.activeTab !== tab.id) {
          this.scene.restart({ heroId: this.heroId, tab: tab.id });
        }
      });

      this.tabBackgrounds.push(bg);
      this.tabLabels.push(label);
      this.tabZones.push(zone);
    });
  }

  private renderOverviewTab(
    heroData: HeroData,
    ownership: HeroOwnershipState,
    save: RealmSaveDataV3,
  ): void {
    const stats = computeHeroStats(heroData.id);
    if (!stats) {
      this.scene.start(SCENE_KEYS.ROSTER);
      return;
    }

    const rp = computeRP(ownership, heroData);
    const levelCap = getLevelCap(ownership.starRank);
    const levelCost = getLevelUpCost(ownership.level);
    const starCost = getStarUpCost(ownership.starRank);
    const totalShards = getTotalShards(save, heroData.id, ownership);

    this.portrait = this.add.circle(110, 130, heroData.radius, heroData.color);

    this.starRating = new StarRating(this, 220, 98, ownership.starRank);

    this.levelLabel = this.add.text(220, 118, `LV ${ownership.level} / ${levelCap}`, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    this.rpLabel = this.add.text(520, 108, `RP: ${rp.toLocaleString()}`, {
      fontSize: '14px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    });

    const metaLine = `Class: ${CLASS_LABELS[heroData.heroClass]}   Faction: ${FACTION_LABELS[heroData.faction]}   Anima Form: ${heroData.animaForm}`;
    this.statTexts.push(
      this.add.text(220, 138, metaLine, {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }),
    );

    this.add.line(0, 0, 40, 165, CANVAS.WIDTH - 40, 165, 0x444466).setOrigin(0);

    this.statTexts.push(
      this.add.text(60, OVERVIEW_STATS_Y, `HP: ${stats.hp.toLocaleString()}   ATK: ${stats.attack}   DEF: ${stats.defense}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }),
    );

    this.add.line(0, 0, 40, 208, CANVAS.WIDTH - 40, 208, 0x444466).setOrigin(0);

    const passiveText = PASSIVE_LABELS[heroData.passiveId] ?? heroData.passiveId;
    const ultimateText = ULTIMATE_LABELS[heroData.ultimateId] ?? heroData.ultimateId;
    this.statTexts.push(
      this.add.text(60, OVERVIEW_PASSIVE_Y, `Passive: ${passiveText}`, {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 100 },
      }),
      this.add.text(60, OVERVIEW_ULTIMATE_Y, `Ultimate: ${ultimateText}`, {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 100 },
      }),
    );

    this.add.line(0, 0, 40, OVERVIEW_SIGILS_Y - 8, CANVAS.WIDTH - 40, OVERVIEW_SIGILS_Y - 8, 0x444466).setOrigin(0);

    this.sigilSlotRow = new HeroSigilSlotRow(
      this,
      60,
      OVERVIEW_SIGILS_Y,
      (slotIndex, instanceId) => this.handleSigilSlotTap(slotIndex, instanceId),
    );
    this.sigilSlotRow.refresh(save, heroData.id);

    this.add.line(
      0,
      0,
      40,
      OVERVIEW_PROGRESS_DIVIDER_Y,
      CANVAS.WIDTH - 40,
      OVERVIEW_PROGRESS_DIVIDER_Y,
      0x444466,
    ).setOrigin(0);

    const xpTarget = 100;
    const xpProgress = xpTarget > 0 ? Math.min(1, ownership.currentXP / xpTarget) : 0;
    this.xpBar = new ProgressBar(this, 60, OVERVIEW_XP_BAR_Y, 280, 8, 0x44aa66, 0x333344);
    this.xpBar.setProgress(xpProgress);

    this.xpLabel = this.add.text(60, OVERVIEW_XP_LABEL_Y, `XP: ${ownership.currentXP} / ${xpTarget}`, {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    const shardNeed = starCost?.shards ?? 0;
    this.shardLabel = this.add.text(400, OVERVIEW_XP_BAR_Y, `Shards: ${totalShards} / ${shardNeed || '—'}`, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    const canLevel = ownership.level < levelCap
      && canAfford('gold', levelCost.gold)
      && canAfford('xpFragments', levelCost.xpFragments);

    const goldBalance = EconomySystem.getCurrencyBalance(save, 'gold');
    let starLabel = 'MAX STARS';
    let canStar = false;
    if (starCost) {
      const hasShards = totalShards >= starCost.shards;
      const hasGold = goldBalance >= starCost.gold;
      canStar = hasShards && hasGold;
      const transition = `${ownership.starRank}★→${ownership.starRank + 1}★`;
      if (canStar) {
        starLabel = `STAR UP — ${transition}: ${starCost.shards} shards + ${starCost.gold.toLocaleString()}G`;
      } else if (!hasShards) {
        starLabel = `STAR UP — need ${starCost.shards} shards (have ${totalShards})`;
      } else {
        starLabel = `STAR UP — need ${starCost.gold.toLocaleString()}G (have ${goldBalance.toLocaleString()}G)`;
      }
    }

    const levelLabel = `LEVEL UP — ${levelCost.gold}G + ${levelCost.xpFragments} XP Frag`;
    this.levelUpButton = new ButtonPrimary(
      this,
      220,
      OVERVIEW_ACTION_BUTTON_Y,
      levelLabel,
      () => this.handleLevelUp(),
      280,
    );
    this.levelUpButton.setEnabled(canLevel);

    const starLabelText = starLabel;
    this.starUpButton = new ButtonPrimary(
      this,
      580,
      OVERVIEW_ACTION_BUTTON_Y,
      starLabelText,
      () => this.handleStarUp(),
      280,
    );
    this.starUpButton.setEnabled(canStar);
  }

  private handleSigilSlotTap(slotIndex: 0 | 1, instanceId: string | null): void {
    if (instanceId) {
      this.scene.start(SCENE_KEYS.SIGIL_UPGRADE, {
        sigilInstanceId: instanceId,
        heroId: this.heroId,
        returnScene: SCENE_KEYS.HERO_DETAIL,
        returnData: { heroId: this.heroId, tab: this.activeTab },
      });
      return;
    }

    this.scene.start(SCENE_KEYS.SIGIL, {
      heroId: this.heroId,
      slotIndex,
    });
  }

  private renderAwakeningTab(
    heroData: HeroData,
    ownership: HeroOwnershipState,
    save: RealmSaveDataV3,
  ): void {
    const kit = getHeroCombatKit(heroData.id);
    const awakeningLevel = AwakeningSystem.getAwakeningLevel(save, heroData.id);
    const unlocked = AwakeningSystem.isUnlocked(save, heroData.id);
    let y = 100;

    const pushText = (
      text: string,
      options: Phaser.Types.GameObjects.Text.TextStyle & { wordWrap?: { width: number } } = {},
    ): void => {
      const label = this.add.text(60, y, text, {
        fontSize: '11px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        ...options,
      });
      this.awakeningTexts.push(label);
      y += options.wordWrap ? 44 : 22;
    };

    if (!unlocked) {
      pushText('AWAKENING LOCKED', { fontSize: '14px', color: '#ff8888' });
      pushText(`Requires ${AWAKENING.REQUIRED_STAR_RANK}★ star rank (current: ${ownership.starRank}★)`, {
        color: '#ffaaaa',
      });
      pushText('Reach max star rank to unlock hero awakening progression.', {
        wordWrap: { width: CANVAS.WIDTH - 120 },
      });
      pushText('Materials needed per level: Gold + Awakening Crystals.', { color: '#888899' });
      return;
    }

    pushText(`AWAKENING — Level ${awakeningLevel} / ${AWAKENING.MAX_LEVEL}`, {
      fontSize: '14px',
      color: '#ffcc66',
    });

    if (awakeningLevel > 0) {
      const currentData = getAwakeningLevelData(heroData.id, awakeningLevel as 1 | 2 | 3);
      if (currentData) {
        pushText(currentData.description, {
          wordWrap: { width: CANVAS.WIDTH - 120 },
          color: '#aaaacc',
        });
      }

      pushText('Active skill modifiers:', { color: '#ffffff', fontSize: '12px' });
      const applied = AwakeningSystem.getSkillModifiers(save, heroData.id);
      if (kit && applied.length > 0) {
        for (const modifier of applied) {
          pushText(`• ${formatSkillModifier(modifier, kit)}`, { color: '#88ccff' });
        }
      } else {
        pushText('• None', { color: '#888899' });
      }
    } else {
      pushText('This hero has not been awakened yet.', { color: '#aaaacc' });
    }

    if (awakeningLevel < AWAKENING.MAX_LEVEL) {
      y += 8;
      const nextLevel = (awakeningLevel + 1) as 1 | 2 | 3;
      const nextData = getAwakeningLevelData(heroData.id, nextLevel);
      const cost = AwakeningSystem.getNextAwakeningCost(heroData.id, awakeningLevel);
      const goldBalance = EconomySystem.getCurrencyBalance(save, 'gold');
      const crystalBalance = InventorySystem.getQuantity(save, AWAKENING_CRYSTAL_ITEM_ID);

      pushText(`Next: Awakening Lv${nextLevel}`, { color: '#ffffff', fontSize: '12px' });
      if (nextData) {
        pushText(nextData.description, {
          wordWrap: { width: CANVAS.WIDTH - 120 },
          color: '#aaaacc',
        });
        if (kit) {
          pushText('Skill preview:', { color: '#ffffff', fontSize: '12px' });
          for (const modifier of nextData.skillModifiers) {
            pushText(`• ${formatSkillModifier(modifier, kit)}`, { color: '#aaddaa' });
          }
        }
      }

      pushText(
        `Cost: ${cost.gold.toLocaleString()} Gold + ${cost.awakeningCrystals} Awakening Crystals`,
        { color: '#ffdd88' },
      );
      pushText(
        `You have: ${goldBalance.toLocaleString()} Gold, ${crystalBalance} Crystals`,
        { color: '#888899' },
      );

      const eligible = AwakeningSystem.isEligible(save, heroData.id);
      this.awakenButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH / 2,
        CANVAS.HEIGHT - 48,
        `AWAKEN — Lv${nextLevel}`,
        () => this.handleAwaken(),
        220,
      );
      this.awakenButton.setEnabled(eligible);
    } else {
      pushText('MAX AWAKENING REACHED', { color: '#88ff88', fontSize: '12px' });
    }
  }

  private handleLevelUp(): void {
    if (levelUp(this.heroId)) {
      this.scene.restart({ heroId: this.heroId, tab: this.activeTab });
      return;
    }
    this.showToast('Not enough Gold or XP Fragments');
  }

  private handleStarUp(): void {
    if (starUp(this.heroId)) {
      this.scene.restart({ heroId: this.heroId, tab: this.activeTab });
      return;
    }

    const realm = loadCurrentRealm();
    const ownership = realm?.ownedHeroes.find(
      (hero) => hero.heroId === this.heroId && hero.isOwned,
    );
    const starCost = ownership ? getStarUpCost(ownership.starRank) : null;
    if (realm && ownership && starCost) {
      const save = realm as RealmSaveDataV3;
      const totalShards = getTotalShards(save, this.heroId, ownership);
      const goldBalance = EconomySystem.getCurrencyBalance(save, 'gold');
      if (totalShards < starCost.shards) {
        this.showToast(`Need ${starCost.shards} shards (have ${totalShards})`);
        return;
      }
      if (goldBalance < starCost.gold) {
        this.showToast(`Need ${starCost.gold.toLocaleString()} Gold (have ${goldBalance.toLocaleString()})`);
        return;
      }
    }
    this.showToast('Not enough shards or Gold');
  }

  private handleAwaken(): void {
    const result = awakenHero(this.heroId);
    if (result.success) {
      this.scene.restart({ heroId: this.heroId, tab: 'awakening' });
      return;
    }
    this.showToast(result.reason ?? 'Cannot awaken hero');
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 90, message, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(2200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  private openDissolveModal(shardYield: number): void {
    this.dissolveModal = new HubOverlayPanel(this);
    this.dissolveModal.open('Dissolve Relic Bearer?', () => {
      this.dissolveModal?.close();
    });
    this.dissolveModal.addText(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - 20,
      `Dissolving grants ${shardYield} shards. This cannot be undone.`,
      '#ffaaaa',
    );
    this.dissolveModal.addButton(
      CANVAS.WIDTH / 2 - 80,
      CANVAS.HEIGHT / 2 + 40,
      'CANCEL',
      () => this.dissolveModal?.close(),
      120,
    );
    this.dissolveModal.addButton(
      CANVAS.WIDTH / 2 + 80,
      CANVAS.HEIGHT / 2 + 40,
      'CONFIRM',
      () => {
        this.dissolveModal?.close();
        if (dissolve(this.heroId)) {
          this.scene.start(SCENE_KEYS.ROSTER);
        }
      },
      120,
    );
  }
}
