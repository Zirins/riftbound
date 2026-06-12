// src/scenes/HeroDetailScene.ts
// Full hero profile — stats, RP, level up, star up, and dissolve.

import Phaser from 'phaser';
import {
  CANVAS,
  DISSOLVE_SHARDS,
  UI,
} from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { FACTION_LABELS, HEROES_DATA } from '../data/heroes';
import { canAfford } from '../systems/EconomySystem';
import {
  computeHeroStats,
  computeRP,
  getLevelCap,
  getLevelUpCost,
  levelUp,
} from '../systems/HeroProgressionSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { dissolve, getStarUpCost, getTotalShards, starUp } from '../systems/ShardSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { HubOverlayPanel } from '../ui/HubOverlayPanel';
import { ProgressBar } from '../ui/ProgressBar';
import { StarRating } from '../ui/StarRating';
import type { HeroData, HeroOwnershipState } from '../types';

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
};

export class HeroDetailScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.HERO_DETAIL;

  private heroId = '';

  private backButton: ButtonPrimary | null = null;
  private dissolveButton: ButtonPrimary | null = null;
  private levelUpButton: ButtonPrimary | null = null;
  private starUpButton: ButtonPrimary | null = null;
  private starRating: StarRating | null = null;
  private xpBar: ProgressBar | null = null;
  private dissolveModal: HubOverlayPanel | null = null;

  private portrait: Phaser.GameObjects.Arc | null = null;
  private readonly statTexts: Phaser.GameObjects.Text[] = [];
  private rpLabel: Phaser.GameObjects.Text | null = null;
  private levelLabel: Phaser.GameObjects.Text | null = null;
  private shardLabel: Phaser.GameObjects.Text | null = null;
  private xpLabel: Phaser.GameObjects.Text | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: HeroDetailScene.KEY });
  }

  init(data: { heroId?: string }): void {
    this.heroId = data.heroId ?? '';
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

    this.renderLayout(heroData, ownership, realm);
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
    this.backButton = null;
    this.dissolveButton = null;
    this.levelUpButton = null;
    this.starUpButton = null;

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
  }

  private renderLayout(
    heroData: HeroData,
    ownership: HeroOwnershipState,
    realm: NonNullable<ReturnType<typeof loadCurrentRealm>>,
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
    const totalShards = getTotalShards(realm, heroData.id, ownership);
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

    this.portrait = this.add.circle(110, 120, heroData.radius, heroData.color);

    this.starRating = new StarRating(this, 220, 88, ownership.starRank);

    this.levelLabel = this.add.text(220, 108, `LV ${ownership.level} / ${levelCap}`, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    this.rpLabel = this.add.text(520, 98, `RP: ${rp.toLocaleString()}`, {
      fontSize: '14px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    });

    const metaLine = `Class: ${CLASS_LABELS[heroData.heroClass]}   Faction: ${FACTION_LABELS[heroData.faction]}   Anima Form: ${heroData.animaForm}`;
    this.statTexts.push(
      this.add.text(220, 128, metaLine, {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }),
    );

    this.add.line(0, 0, 40, 155, CANVAS.WIDTH - 40, 155, 0x444466).setOrigin(0);

    this.statTexts.push(
      this.add.text(60, 172, `HP: ${stats.hp.toLocaleString()}   ATK: ${stats.attack}   DEF: ${stats.defense}`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }),
    );

    this.add.line(0, 0, 40, 198, CANVAS.WIDTH - 40, 198, 0x444466).setOrigin(0);

    const passiveText = PASSIVE_LABELS[heroData.passiveId] ?? heroData.passiveId;
    const ultimateText = ULTIMATE_LABELS[heroData.ultimateId] ?? heroData.ultimateId;
    this.statTexts.push(
      this.add.text(60, 212, `Passive: ${passiveText}`, {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 100 },
      }),
      this.add.text(60, 232, `Ultimate: ${ultimateText}`, {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 100 },
      }),
    );

    this.add.line(0, 0, 40, 258, CANVAS.WIDTH - 40, 258, 0x444466).setOrigin(0);

    const xpTarget = 100;
    const xpProgress = xpTarget > 0 ? Math.min(1, ownership.currentXP / xpTarget) : 0;
    this.xpBar = new ProgressBar(this, 60, 278, 280, 8, 0x44aa66, 0x333344);
    this.xpBar.setProgress(xpProgress);

    this.xpLabel = this.add.text(60, 292, `XP: ${ownership.currentXP} / ${xpTarget}`, {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    const shardNeed = starCost?.shards ?? 0;
    this.shardLabel = this.add.text(400, 278, `Shards: ${totalShards} / ${shardNeed || '—'}`, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    const canLevel = ownership.level < levelCap
      && canAfford('gold', levelCost.gold)
      && canAfford('xpFragments', levelCost.xpFragments);

    const canStar = starCost !== null
      && totalShards >= starCost.shards
      && canAfford('gold', starCost.gold);

    const levelLabel = `LEVEL UP — ${levelCost.gold}G + ${levelCost.xpFragments} XP Frag`;
    this.levelUpButton = new ButtonPrimary(
      this,
      220,
      CANVAS.HEIGHT - 48,
      levelLabel,
      () => this.handleLevelUp(),
      280,
    );
    this.levelUpButton.setEnabled(canLevel);

    const starLabel = starCost
      ? `STAR UP — ${ownership.starRank}★→${ownership.starRank + 1}★: ${starCost.shards} shards`
      : 'MAX STARS';
    this.starUpButton = new ButtonPrimary(
      this,
      580,
      CANVAS.HEIGHT - 48,
      starLabel,
      () => this.handleStarUp(),
      280,
    );
    this.starUpButton.setEnabled(canStar);
  }

  private handleLevelUp(): void {
    if (levelUp(this.heroId)) {
      this.scene.restart({ heroId: this.heroId });
      return;
    }
    this.showToast('Not enough Gold or XP Fragments');
  }

  private handleStarUp(): void {
    if (starUp(this.heroId)) {
      this.scene.restart({ heroId: this.heroId });
      return;
    }
    this.showToast('Not enough shards or Gold');
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
