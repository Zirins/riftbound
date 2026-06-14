// src/scenes/StageSelectScene.ts
// Stage detail, energy check, sweep, and battle launch.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { AWAKENING_CRYSTAL_ITEM_ID } from '../data/awakeningData';
import { ENEMY_DISPLAY_LABELS, getEnemyDisplayName, isBossEnemyId } from '../data/enemies';
import * as EnergySystem from '../systems/EnergySystem';
import { getStageData } from '../systems/StageLoader';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { SweepSystem } from '../systems/SweepSystem';
import type { RealmSaveDataV3, StageReward } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

export class StageSelectScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.STAGE_SELECT;

  private stageId = '';
  private sweepToastMessage: string | null = null;
  private backButton: ButtonPrimary | null = null;
  private battleButton: ButtonPrimary | null = null;
  private sweep1Button: ButtonPrimary | null = null;
  private sweep10Button: ButtonPrimary | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: StageSelectScene.KEY });
  }

  init(data: { stageId?: string; sweepToastMessage?: string }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
    this.sweepToastMessage = data.sweepToastMessage ?? null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    EnergySystem.computeRegen();

    const stage = getStageData(this.stageId);
    if (!stage) {
      this.scene.start(SCENE_KEYS.CAMPAIGN);
      return;
    }

    const realm = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!realm) {
      this.scene.start(SCENE_KEYS.CAMPAIGN);
      return;
    }

    if (this.sweepToastMessage) {
      this.showToast(this.sweepToastMessage);
      this.sweepToastMessage = null;
    }

    const cleared = realm.clearedStages.find((record) => record.stageId === this.stageId);
    const energy = realm.inventory.energy;
    const sweepUnlocked = SweepSystem.isSweepUnlocked(realm, this.stageId);
    const sweep1Validation = SweepSystem.canSweep(realm, this.stageId, 1);
    const sweep10Validation = SweepSystem.canSweep(realm, this.stageId, 10);

    this.backButton = new ButtonPrimary(
      this,
      90,
      32,
      '← CAMPAIGN',
      () => this.scene.start(SCENE_KEYS.CAMPAIGN),
      130,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, stage.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const bestStars = cleared
      ? '★'.repeat(cleared.stars) + '☆'.repeat(3 - cleared.stars)
      : '—';
    this.add.text(60, 72, `Best: ${bestStars}   Waves: ${stage.waves.length}   Energy Cost: ${stage.energyCost}   Your Energy: ${energy}/${realm.inventory.maxEnergy}`, {
      fontSize: '10px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    this.add.line(0, 0, 40, 98, CANVAS.WIDTH - 40, 98, 0x444466).setOrigin(0);

    const enemySummary = this.buildEnemySummary(stage.waves);
    this.add.text(60, 112, `Enemies: ${enemySummary}`, {
      fontSize: '10px',
      color: '#ccccdd',
      fontFamily: 'monospace',
      wordWrap: { width: CANVAS.WIDTH - 120 },
    });

    const bossWave = stage.waves.find((wave) => wave.isBossWave);
    const bossEntry = bossWave?.enemies.find((entry) => isBossEnemyId(entry.enemyId));
    if (bossEntry) {
      this.add.text(60, 140, `Boss Wave: ${getEnemyDisplayName(bossEntry.enemyId)}`, {
        fontSize: '10px',
        color: '#ff8888',
        fontFamily: 'monospace',
      });
    }

    this.add.line(0, 0, 40, 168, CANVAS.WIDTH - 40, 168, 0x444466).setOrigin(0);

    const rewardParts = [
      `~${stage.rewards.gold.min}–${stage.rewards.gold.max} Gold`,
      `${stage.rewards.crystals} Crystals`,
      `XP Fragments ×${stage.rewards.xpFragments}`,
    ];
    if (stage.rewards.sigilDrop) {
      rewardParts.push(`Sigil chance ${Math.round(stage.rewards.sigilDrop.chance * 100)}% (${stage.rewards.sigilDrop.rarity})`);
    }
    if (stage.rewards.firstClearItems?.length && !cleared) {
      for (const item of stage.rewards.firstClearItems) {
        const label = item.itemId === AWAKENING_CRYSTAL_ITEM_ID
          ? `Awakening Crystal ×${item.quantity} (first clear)`
          : `${item.itemId} ×${item.quantity} (first clear)`;
        rewardParts.push(label);
      }
    }

    this.add.text(60, 188, `Rewards: ${rewardParts.join('   ')}`, {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      wordWrap: { width: CANVAS.WIDTH - 200 },
    });

    if (sweepUnlocked) {
      this.add.text(60, 248, 'Sweep unlocked (3★) — instant rewards, no battle', {
        fontSize: '10px',
        color: '#88ccff',
        fontFamily: 'monospace',
      });

      this.sweep1Button = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 330,
        CANVAS.HEIGHT - 48,
        `SWEEP 1× (${stage.energyCost}⚡)`,
        () => this.handleSweep(1),
        150,
      );
      this.sweep1Button.setEnabled(sweep1Validation.canSweep);

      this.sweep10Button = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 160,
        CANVAS.HEIGHT - 48,
        `SWEEP 10× (${stage.energyCost * 10}⚡)`,
        () => this.handleSweep(10),
        150,
      );
      this.sweep10Button.setEnabled(sweep10Validation.canSweep);
    }

    const canBattle = EnergySystem.hasEnough(stage.energyCost);
    this.battleButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 120,
      sweepUnlocked ? CANVAS.HEIGHT - 96 : CANVAS.HEIGHT - 48,
      `BATTLE → (${stage.energyCost}⚡)`,
      () => this.handleBattle(stage.energyCost),
      200,
    );
    this.battleButton.setEnabled(canBattle);
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    this.backButton?.destroy();
    this.battleButton?.destroy();
    this.sweep1Button?.destroy();
    this.sweep10Button?.destroy();
    this.toastTimer = null;
    this.toastLabel = null;
    this.backButton = null;
    this.battleButton = null;
    this.sweep1Button = null;
    this.sweep10Button = null;
  }

  private handleBattle(energyCost: number): void {
    if (!EnergySystem.hasEnough(energyCost)) {
      this.showToast('Not enough energy. Regenerates 1/min.');
      return;
    }
    if (!EnergySystem.deduct(energyCost)) {
      this.showToast('Not enough energy. Regenerates 1/min.');
      return;
    }
    this.scene.start(SCENE_KEYS.FORMATION, { stageId: this.stageId });
  }

  private handleSweep(count: 1 | 10): void {
    EnergySystem.computeRegen();
    const realm = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!realm) {
      this.showToast('No save loaded.');
      return;
    }

    const validation = SweepSystem.canSweep(realm, this.stageId, count);
    if (!validation.canSweep) {
      this.showToast(validation.reason ?? 'Cannot sweep this stage.');
      return;
    }

    const result = SweepSystem.sweep(realm, this.stageId, count);
    if (!result.success) {
      this.showToast(result.reason ?? 'Sweep failed.');
      return;
    }

    this.scene.restart({
      stageId: this.stageId,
      sweepToastMessage: this.formatSweepSummary(result.rewards, result.energySpent),
    });
  }

  private formatSweepSummary(rewards: StageReward[], energySpent: number): string {
    const gold = rewards.reduce((sum, reward) => sum + reward.gold, 0);
    const crystals = rewards.reduce((sum, reward) => sum + reward.crystals, 0);
    const xpFragments = rewards.reduce((sum, reward) => sum + reward.xpFragments, 0);
    const sigils = rewards.reduce((sum, reward) => sum + reward.sigilGrants.length, 0);
    const parts = [
      `Sweep complete! −${energySpent}⚡`,
      `+${gold} Gold`,
      `+${crystals} Crystals`,
      `+${xpFragments} XP`,
    ];
    if (sigils > 0) parts.push(`+${sigils} Sigil${sigils === 1 ? '' : 's'}`);
    return parts.join('   ');
  }

  private buildEnemySummary(
    waves: { enemies: { enemyId: string; count: number }[] }[],
  ): string {
    const totals = new Map<string, number>();
    for (const wave of waves) {
      for (const entry of wave.enemies) {
        if (isBossEnemyId(entry.enemyId)) continue;
        totals.set(entry.enemyId, (totals.get(entry.enemyId) ?? 0) + entry.count);
      }
    }
    return [...totals.entries()]
      .map(([id, count]) => `${ENEMY_DISPLAY_LABELS[id] ?? id} ×${count}`)
      .join('  ');
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();
    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 120, message, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#333355',
      padding: { x: 10, y: 6 },
      align: 'center',
      wordWrap: { width: CANVAS.WIDTH - 80 },
    }).setOrigin(0.5).setDepth(1000);
    this.toastTimer = this.time.delayedCall(3200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
    });
  }
}
