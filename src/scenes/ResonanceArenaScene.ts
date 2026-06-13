// src/scenes/ResonanceArenaScene.ts
// Resonance Arena — rank tracking, daily opponents, and challenge flow.

import Phaser from 'phaser';
import { ARENA, CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { ArenaOpponent } from '../data/arenaOpponents';
import { HEROES_DATA } from '../data/heroes';
import * as ArenaMatch from '../systems/ArenaMatchSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const OPPONENT_ROW_Y_START = 200;
const OPPONENT_ROW_HEIGHT = 72;

export class ResonanceArenaScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.RESONANCE_ARENA;

  private backButton: ButtonPrimary | null = null;
  private claimButton: ButtonPrimary | null = null;
  private readonly challengeButtons: ButtonPrimary[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;
  private restartTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: ResonanceArenaScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    ArenaMatch.resetIfNewDay();

    const rankPoints = loadCurrentRealm()?.arenaState.rankPoints ?? 0;
    const tierName = ArenaMatch.getTierName(loadCurrentRealm()?.arenaState.rankTier ?? 'rift_initiate');
    const attemptsRemaining = ArenaMatch.getAttemptsRemaining();
    const dailyReward = ArenaMatch.getDailyRewardPreview();
    const opponents = ArenaMatch.getOpponents(3);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'RESONANCE ARENA', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH - 150, 32, `Rank: ${tierName}  #${rankPoints.toLocaleString()}`, {
      fontSize: '10px',
      color: '#ccccdd',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(40, 72, `Daily Attempts: ${attemptsRemaining} / ${ARENA.DAILY_ATTEMPTS} remaining`, {
      fontSize: '12px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    });

    const rewardText = `Daily Reward: ${dailyReward.gold} Gold + ${dailyReward.crystals} Crystals`;
    this.add.text(40, 96, rewardText, {
      fontSize: '11px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    if (ArenaMatch.canClaimDailyReward()) {
      this.claimButton = new ButtonPrimary(
        this,
        CANVAS.WIDTH - 90,
        96,
        'CLAIM',
        () => this.handleClaimReward(),
        90,
      );
    } else {
      this.add.text(CANVAS.WIDTH - 90, 96, ArenaMatch.getAttemptsRemaining() < ARENA.DAILY_ATTEMPTS
        ? '(pending)'
        : '(claimed)', {
        fontSize: '10px',
        color: '#666677',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    this.add.text(40, 132, 'OPPONENTS (refreshes daily):', {
      fontSize: '11px',
      color: '#666677',
      fontFamily: 'monospace',
    });

    this.add.line(40, 155, 0, 0, CANVAS.WIDTH - 80, 0, 0x333344).setOrigin(0);

    opponents.forEach((opponent, index) => {
      this.renderOpponentRow(opponent, OPPONENT_ROW_Y_START + index * OPPONENT_ROW_HEIGHT);
    });
  }

  private renderOpponentRow(opponent: ArenaOpponent, y: number): void {
    this.renderFormationPreview(opponent.heroIds, 56, y);

    this.add.text(120, y - 10, opponent.displayName, {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    this.add.text(120, y + 10, `${ArenaMatch.getTierName(opponent.rankTier)}`, {
      fontSize: '10px',
      color: '#888899',
      fontFamily: 'monospace',
    });

    this.add.text(340, y, `RP ${ArenaMatch.formatRp(opponent.rp)}`, {
      fontSize: '12px',
      color: '#ccccdd',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    const challengeButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 90,
      y,
      'CHALLENGE',
      () => this.handleChallenge(opponent.id),
      110,
    );
    this.challengeButtons.push(challengeButton);
  }

  private renderFormationPreview(heroIds: string[], x: number, y: number): void {
    const radius = 10;
    const spacing = 22;
    heroIds.slice(0, 4).forEach((heroId, index) => {
      const hero = HEROES_DATA.find((entry) => entry.id === heroId);
      const color = hero?.color ?? 0x666666;
      this.add.circle(x + index * spacing, y, radius, color);
    });
  }

  private handleChallenge(opponentId: string): void {
    if (!ArenaMatch.canChallenge()) {
      this.showToast('No attempts remaining today.');
      return;
    }

    this.scene.start(SCENE_KEYS.FORMATION, {
      stageId: 'arena',
      arenaOpponentId: opponentId,
    });
  }

  private handleClaimReward(): void {
    if (ArenaMatch.claimDailyReward()) {
      this.showToast('Daily reward claimed!');
      this.restartTimer?.remove();
      this.restartTimer = this.time.delayedCall(UI.SCENE_RESTART_DELAY_MS, () => {
        this.restartTimer = null;
        this.scene.restart();
      });
      return;
    }
    this.showToast('Daily reward not available.');
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 50, message, {
      fontSize: '12px',
      color: '#ffee88',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.SHORT_TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  shutdown(): void {
    this.restartTimer?.remove();
    this.restartTimer = null;
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.backButton?.destroy();
    this.backButton = null;
    this.claimButton?.destroy();
    this.claimButton = null;
    this.challengeButtons.forEach((button) => button.destroy());
    this.challengeButtons.length = 0;
  }
}
