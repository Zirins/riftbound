// src/scenes/SigilUpgradeScene.ts
// Sigil level up and breakthrough UI (Phase 11).

import Phaser from 'phaser';
import { CANVAS, SIGIL, UI } from '../constants/gameConfig';
import { SCENE_KEYS, type SceneKey } from '../constants/sceneKeys';
import { getSigilDefinition, scalePrimaryStatValue } from '../data/sigils';
import { EconomySystem } from '../systems/EconomySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { SigilSystem } from '../systems/SigilSystem';
import { SigilUpgradeSystem } from '../systems/SigilUpgradeSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

export class SigilUpgradeScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SIGIL_UPGRADE;

  private sigilInstanceId = '';
  private heroId = '';
  private returnScene: SceneKey = SCENE_KEYS.HERO_DETAIL;
  private returnData: Record<string, unknown> = {};

  private backButton: ButtonPrimary | null = null;
  private headerLabel: Phaser.GameObjects.Text | null = null;
  private levelUpButton: ButtonPrimary | null = null;
  private breakthroughButton: ButtonPrimary | null = null;
  private readonly infoTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: SigilUpgradeScene.KEY });
  }

  init(data: {
    sigilInstanceId?: string;
    heroId?: string;
    returnScene?: SceneKey;
    returnData?: Record<string, unknown>;
  }): void {
    this.sigilInstanceId = data.sigilInstanceId ?? '';
    this.heroId = data.heroId ?? '';
    this.returnScene = data.returnScene ?? SCENE_KEYS.HERO_DETAIL;
    this.returnData = data.returnData ?? { heroId: this.heroId, tab: 'overview' };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    this.renderLayout();
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;

    this.backButton?.destroy();
    this.headerLabel?.destroy();
    this.levelUpButton?.destroy();
    this.breakthroughButton?.destroy();
    this.backButton = null;
    this.headerLabel = null;
    this.levelUpButton = null;
    this.breakthroughButton = null;

    for (const text of this.infoTexts) text.destroy();
    this.infoTexts.length = 0;
  }

  private renderLayout(): void {
    const save = this.loadSave();
    const owned = save ? SigilSystem.findOwnedSigil(save, this.sigilInstanceId) : null;
    const definition = owned ? getSigilDefinition(owned.definitionId) : null;

    if (!save || !owned || !definition) {
      this.scene.start(this.returnScene, this.returnData);
      return;
    }

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← BACK',
      () => this.scene.start(this.returnScene, this.returnData),
      110,
    );

    this.headerLabel = this.add.text(CANVAS.WIDTH / 2, 32, 'SIGIL UPGRADE', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    let y = 78;
    const pushLine = (text: string, color = '#ccccdd', fontSize = '11px'): void => {
      this.infoTexts.push(this.add.text(60, y, text, {
        fontSize,
        color,
        fontFamily: 'monospace',
        wordWrap: { width: CANVAS.WIDTH - 120 },
      }));
      y += fontSize === '14px' ? 28 : 20;
    };

    const primaryValue = scalePrimaryStatValue(definition.primaryStat.value, owned.level);
    const bonuses = SigilSystem.computeOwnedSigilBonuses(owned);

    pushLine(definition.name, '#ffffff', '14px');
    pushLine(`${definition.rarity.toUpperCase()} · ${definition.element} · ${definition.primaryStat.statType}`, '#aaaacc');
    pushLine(`Level ${owned.level} / ${SIGIL.MAX_LEVEL} · Breakthrough ${owned.breakthroughLevel} / 3`, '#ffcc66');
    pushLine(`Primary bonus: +${primaryValue} ${definition.primaryStat.statType}`, '#88ccff');
    if (owned.secondaryStats.length > 0) {
      pushLine(
        `Secondary: ${owned.secondaryStats.map((roll) => `${roll.statType}+${roll.value}`).join(', ')}`,
        '#aaddaa',
      );
    }
    pushLine(
      `Total combat bonus: HP+${bonuses.hp ?? 0} ATK+${bonuses.attack ?? 0} DEF+${bonuses.defense ?? 0}`,
      '#888899',
      '10px',
    );

    const goldBalance = EconomySystem.getCurrencyBalance(save, 'gold');
    const dustBalance = InventorySystem.getQuantity(save, 'sigil_dust');

    if (owned.level < SIGIL.MAX_LEVEL) {
      const levelCost = SIGIL.LEVEL_COST_GOLD[owned.level - 1] ?? 0;
      pushLine(`Level Up cost: ${levelCost.toLocaleString()} Gold (have ${goldBalance.toLocaleString()})`, '#ffdd88');
      const canLevel = goldBalance >= levelCost;
      this.levelUpButton = new ButtonPrimary(
        this,
        220,
        CANVAS.HEIGHT - 48,
        `LEVEL UP → Lv${owned.level + 1}`,
        () => this.handleLevelUp(),
        260,
      );
      this.levelUpButton.setEnabled(canLevel);
    } else {
      pushLine('Sigil is max level.', '#88ff88');
    }

    if (owned.breakthroughLevel < 3) {
      const breakthroughIndex = owned.breakthroughLevel as 0 | 1 | 2;
      const requiredLevel = SIGIL.BREAKTHROUGH_LEVELS[breakthroughIndex];
      const dustCost = SIGIL.BREAKTHROUGH_DUST[requiredLevel - 1] ?? 0;
      const goldCost = SIGIL.LEVEL_COST_GOLD[requiredLevel - 1] ?? 0;
      const canBreakthrough = owned.level >= requiredLevel
        && dustBalance >= dustCost
        && goldBalance >= goldCost;

      pushLine(
        `Breakthrough ${owned.breakthroughLevel + 1}: Lv${requiredLevel}+, ${dustCost} Dust, ${goldCost.toLocaleString()}G`,
        '#ccaaee',
      );
      pushLine(`Dust: ${dustBalance} · Gold: ${goldBalance.toLocaleString()}`, '#888899', '10px');

      this.breakthroughButton = new ButtonPrimary(
        this,
        580,
        CANVAS.HEIGHT - 48,
        `BREAKTHROUGH ${owned.breakthroughLevel + 1}`,
        () => this.handleBreakthrough(),
        260,
      );
      this.breakthroughButton.setEnabled(canBreakthrough);
    } else {
      pushLine('Max breakthrough reached.', '#88ff88');
    }
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
  }

  private handleLevelUp(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = SigilUpgradeSystem.levelUp(save, this.sigilInstanceId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Level up failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart({
      sigilInstanceId: this.sigilInstanceId,
      heroId: this.heroId,
      returnScene: this.returnScene,
      returnData: this.returnData,
    });
  }

  private handleBreakthrough(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = SigilUpgradeSystem.breakthrough(save, this.sigilInstanceId);
    if (!result.success) {
      this.showToast(result.reason ?? 'Breakthrough failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart({
      sigilInstanceId: this.sigilInstanceId,
      heroId: this.heroId,
      returnScene: this.returnScene,
      returnData: this.returnData,
    });
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 90, message, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(2200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }
}
