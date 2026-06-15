// src/scenes/VoidTrialScene.ts
// Void Trial tower — floor selector, daily attempts, battle launch (Section 21).

import Phaser from 'phaser';
import { CANVAS, UI, VOID_TRIAL } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getVoidTrialFloor } from '../data/voidTrialFloors';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import { VoidTrialSystem } from '../systems/VoidTrialSystem';
import type { RealmSaveDataV3, RewardBundle } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const FLOOR_COLS = 5;
const FLOOR_COLS_SPACING = 72;
const FLOOR_ROW_START_X = 130;
const FLOOR_ROW_START_Y = 150;
const FLOOR_ROW_HEIGHT = 36;

const CURRENCY_LABELS: Record<string, string> = {
  gold: 'Gold',
  rift_crystal: 'Rift Crystals',
  void_gem: 'Void Gems',
  energy: 'Energy',
};

const ITEM_LABELS: Record<string, string> = {
  xp_fragment: 'XP Fragments',
  sigil_dust: 'Sigil Dust',
  sigil_box_rare: 'Rare Sigil Box',
  sigil_box_epic: 'Epic Sigil Box',
  awakening_crystal: 'Awakening Crystal',
};

function formatRewardBundleLines(bundle: RewardBundle): string[] {
  const lines: string[] = [];

  for (const currency of bundle.currencies ?? []) {
    const label = CURRENCY_LABELS[currency.type] ?? currency.type;
    lines.push(`${label}: ${currency.amount.toLocaleString()}`);
  }

  for (const item of bundle.items ?? []) {
    const label = ITEM_LABELS[item.itemId] ?? item.itemId;
    lines.push(`${label}: x${item.quantity}`);
  }

  return lines;
}

export class VoidTrialScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.VOID_TRIAL;

  private selectedFloor = 1;
  private battleWon: boolean | null = null;
  private battleFloor: number | null = null;
  private firstClearBundle: RewardBundle | null = null;

  private backButton: ButtonPrimary | null = null;
  private fightButton: ButtonPrimary | null = null;
  private claimButton: ButtonPrimary | null = null;
  private floorButtons: ButtonPrimary[] = [];
  private rewardPanel: Phaser.GameObjects.Rectangle | null = null;
  private rewardTexts: Phaser.GameObjects.Text[] = [];
  private rewardDismissTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: VoidTrialScene.KEY });
  }

  init(data: {
    battleWon?: boolean;
    voidTrialFloor?: number;
    firstClearBundle?: RewardBundle;
  }): void {
    this.battleWon = data.battleWon ?? null;
    this.battleFloor = data.voidTrialFloor ?? null;
    this.firstClearBundle = data.firstClearBundle ?? null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    VoidTrialSystem.syncResets(save);
    saveCurrentRealm(save);

    if (this.battleWon !== null && this.battleFloor !== null) {
      const result = VoidTrialSystem.resolveFloorResult(save, this.battleFloor, this.battleWon);
      saveCurrentRealm(save);
      if (result.firstClearGranted && result.firstClearBundle) {
        this.firstClearBundle = result.firstClearBundle;
      }
      this.battleWon = null;
      this.battleFloor = null;
    }

    const attemptsRemaining = VoidTrialSystem.getDailyAttempts(save);
    const { highestFloorCleared, weeklyHighestFloor } = save.voidTrialState;

    if (this.selectedFloor > highestFloorCleared + 1) {
      this.selectedFloor = Math.min(highestFloorCleared + 1, VOID_TRIAL.MAX_FLOOR);
    }
    if (this.selectedFloor < 1) this.selectedFloor = 1;

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'VOID TRIAL', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(40, 72, `Highest Cleared: Floor ${highestFloorCleared} / ${VOID_TRIAL.MAX_FLOOR}`, {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    this.add.text(40, 92, `Daily Attempts: ${attemptsRemaining} / ${VOID_TRIAL.DAILY_ATTEMPTS}`, {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    this.add.text(40, 112, `Weekly Best: Floor ${weeklyHighestFloor}`, {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    if (VoidTrialSystem.canClaimWeeklyReward(save)) {
      this.claimButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 100,
        100,
        'CLAIM WEEKLY',
        () => this.handleClaimWeekly(),
        130,
      );
    } else {
      this.add.text(CANVAS.WIDTH - 100, 100, save.voidTrialState.weeklyMilestoneClaimed
        ? '(weekly claimed)'
        : '(no weekly progress)', {
        fontSize: '10px',
        color: '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    this.add.text(40, 132, 'SELECT FLOOR:', {
      fontSize: '11px',
      color: '#666677',
      fontFamily: 'monospace',
    });

    this.buildFloorGrid(save);

    const floorDef = getVoidTrialFloor(this.selectedFloor);
    this.add.text(CANVAS.WIDTH / 2, 330, floorDef?.name ?? `Floor ${this.selectedFloor}`, {
      fontSize: '13px',
      color: '#ccccdd',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.fightButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      360,
      'FIGHT',
      () => this.handleFight(),
      140,
    );

    if (this.firstClearBundle) {
      this.showFirstClearRewardPanel(this.firstClearBundle);
      this.firstClearBundle = null;
    }
  }

  private buildFloorGrid(save: RealmSaveDataV3): void {
    const { highestFloorCleared } = save.voidTrialState;

    for (let floor = 1; floor <= VOID_TRIAL.MAX_FLOOR; floor += 1) {
      const col = (floor - 1) % FLOOR_COLS;
      const row = Math.floor((floor - 1) / FLOOR_COLS);
      const x = FLOOR_ROW_START_X + col * FLOOR_COLS_SPACING;
      const y = FLOOR_ROW_START_Y + row * FLOOR_ROW_HEIGHT;

      const cleared = floor <= highestFloorCleared;
      const unlocked = floor <= highestFloorCleared + 1;

      let label = `${floor}`;
      if (!unlocked) label = `🔒${floor}`;
      else if (cleared) label = `✓${floor}`;

      const button = new ButtonPrimary(
        this,
        x,
        y,
        label,
        () => {
          if (!unlocked) return;
          this.selectedFloor = floor;
          this.scene.restart();
        },
        56,
        28,
      );

      if (!unlocked) {
        button.setEnabled(false);
      }

      this.floorButtons.push(button);
    }
  }

  private handleFight(): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const attempt = VoidTrialSystem.attemptFloor(save, this.selectedFloor);
    if (!attempt.success) {
      this.showMessage(attempt.reason ?? 'Cannot attempt this floor');
      return;
    }

    saveCurrentRealm(save);

    this.scene.start(SCENE_KEYS.FORMATION, {
      stageId: 'void_trial',
      voidTrialFloor: this.selectedFloor,
    });
  }

  private handleClaimWeekly(): void {
    const realm = loadCurrentRealm();
    if (!realm) return;

    const save = realm as RealmSaveDataV3;
    const result = VoidTrialSystem.claimWeeklyReward(save);
    if (!result.success) {
      this.showMessage(result.reason ?? 'Cannot claim weekly reward');
      return;
    }

    saveCurrentRealm(save);
    if (result.bundle) {
      this.showFirstClearRewardPanel(result.bundle, 'WEEKLY REWARD');
    }
    this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => this.scene.restart());
  }

  private showFirstClearRewardPanel(bundle: RewardBundle, title = 'FIRST-CLEAR REWARD'): void {
    this.clearRewardPanel();

    const lines = formatRewardBundleLines(bundle);
    const panelHeight = 56 + lines.length * 18;
    const panelY = CANVAS.HEIGHT / 2 - panelHeight / 2;

    this.rewardPanel = this.add.rectangle(
      CANVAS.WIDTH / 2,
      panelY + panelHeight / 2,
      320,
      panelHeight,
      0x1a1a2e,
    ).setStrokeStyle(2, 0x6644aa);

    const texts: Phaser.GameObjects.Text[] = [];
    texts.push(this.add.text(CANVAS.WIDTH / 2, panelY + 16, title, {
      fontSize: '12px',
      color: '#ffcc66',
      fontFamily: 'monospace',
    }).setOrigin(0.5));

    lines.forEach((line, index) => {
      texts.push(this.add.text(CANVAS.WIDTH / 2, panelY + 38 + index * 18, line, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5));
    });

    this.rewardTexts = texts;

    this.rewardDismissTimer = this.time.delayedCall(4000, () => {
      this.clearRewardPanel();
    });
  }

  private showMessage(message: string): void {
    const label = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 40, message, {
      fontSize: '11px',
      color: '#ffee88',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.time.delayedCall(UI.SHORT_TOAST_DURATION_MS, () => label.destroy());
  }

  private clearRewardPanel(): void {
    this.rewardDismissTimer?.remove();
    this.rewardDismissTimer = null;
    this.rewardPanel?.destroy();
    this.rewardPanel = null;
    for (const text of this.rewardTexts) text.destroy();
    this.rewardTexts = [];
  }

  shutdown(): void {
    this.clearRewardPanel();
    this.backButton?.destroy();
    this.fightButton?.destroy();
    this.claimButton?.destroy();
    for (const button of this.floorButtons) button.destroy();
    this.floorButtons = [];
    this.backButton = null;
    this.fightButton = null;
    this.claimButton = null;
  }
}
