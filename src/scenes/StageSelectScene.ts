// src/scenes/StageSelectScene.ts
// Stage detail, energy check, and battle launch.

import Phaser from 'phaser';
import { CANVAS, ENEMIES, UI, WARDEN } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import * as EnergySystem from '../systems/EnergySystem';
import { getStageData } from '../systems/StageLoader';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const ENEMY_LABELS: Record<string, string> = {
  [ENEMIES.GRUNT.ID]: 'Grunt',
  [ENEMIES.SPECTER.ID]: 'Specter',
  [ENEMIES.IRONCLAD.ID]: 'Ironclad',
  [ENEMIES.INVOKER.ID]: 'Invoker',
  [WARDEN.ID]: 'Warden',
};

export class StageSelectScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.STAGE_SELECT;

  private stageId = '';
  private backButton: ButtonPrimary | null = null;
  private battleButton: ButtonPrimary | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: StageSelectScene.KEY });
  }

  init(data: { stageId?: string }): void {
    this.stageId = data.stageId ?? 'stage_1_1';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    EnergySystem.computeRegen();

    const stage = getStageData(this.stageId);
    if (!stage) {
      this.scene.start(SCENE_KEYS.CAMPAIGN);
      return;
    }

    const realm = loadCurrentRealm();
    const cleared = realm?.clearedStages.find((record) => record.stageId === this.stageId);
    const energy = realm?.inventory.energy ?? 0;

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
    this.add.text(60, 72, `Best: ${bestStars}   Waves: ${stage.waves.length}   Energy Cost: ${stage.energyCost}   Your Energy: ${energy}/${realm?.inventory.maxEnergy ?? 150}`, {
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
    const bossText = bossWave?.enemies.some((e) => e.enemyId === WARDEN.ID)
      ? 'Boss Wave: Rift Warden'
      : '';
    if (bossText) {
      this.add.text(60, 140, bossText, {
        fontSize: '10px',
        color: '#ff8888',
        fontFamily: 'monospace',
      });
    }

    this.add.line(0, 0, 40, 168, CANVAS.WIDTH - 40, 168, 0x444466).setOrigin(0);

    this.add.text(60, 188, `Rewards: ~${stage.rewards.gold.min}–${stage.rewards.gold.max} Gold   ${stage.rewards.crystals} Crystals   XP Fragments ×${stage.rewards.xpFragments}`, {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      wordWrap: { width: CANVAS.WIDTH - 200 },
    });

    const canBattle = EnergySystem.hasEnough(stage.energyCost);
    this.battleButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 120,
      CANVAS.HEIGHT - 48,
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
    this.toastTimer = null;
    this.toastLabel = null;
    this.backButton = null;
    this.battleButton = null;
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

  private buildEnemySummary(
    waves: { enemies: { enemyId: string; count: number }[] }[],
  ): string {
    const totals = new Map<string, number>();
    for (const wave of waves) {
      for (const entry of wave.enemies) {
        if (entry.enemyId === WARDEN.ID) continue;
        totals.set(entry.enemyId, (totals.get(entry.enemyId) ?? 0) + entry.count);
      }
    }
    return [...totals.entries()]
      .map(([id, count]) => `${ENEMY_LABELS[id] ?? id} ×${count}`)
      .join('  ');
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
}
