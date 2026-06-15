// src/scenes/CovBossScene.ts
// Weekly Sect boss — shared HP, attempts, NPC contribution (Section 26).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { CovBossSystem } from '../systems/CovBossSystem';
import { CovSystem } from '../systems/CovSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

export class CovBossScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.COVENANT_BOSS;

  private battleWon: boolean | null = null;
  private battleWavesCleared = 0;
  private battleTotalWaves = 0;

  private backButton: ButtonPrimary | null = null;
  private fightButton: ButtonPrimary | null = null;
  private infoTexts: Phaser.GameObjects.Text[] = [];
  private infoVisuals: Phaser.GameObjects.GameObject[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: CovBossScene.KEY });
  }

  init(data: {
    battleWon?: boolean;
    wavesCleared?: number;
    totalWaves?: number;
  }): void {
    this.battleWon = data.battleWon ?? null;
    this.battleWavesCleared = data.wavesCleared ?? 0;
    this.battleTotalWaves = data.totalWaves ?? 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    if (!CovSystem.isInCovenant(save)) {
      this.scene.start(SCENE_KEYS.COVENANT_HUB);
      return;
    }

    CovBossSystem.ensureCurrentWeek(save);
    CovBossSystem.syncNpcDamage(save);

    if (this.battleWon !== null) {
      const result = CovBossSystem.resolveBattleResult(
        save,
        this.battleWon,
        this.battleWavesCleared,
        this.battleTotalWaves,
      );
      saveCurrentRealm(save);

      const outcome = this.battleWon ? 'Victory' : 'Defeat';
      this.showToast(
        `${outcome} — ${result.damageDealt.toLocaleString()} damage dealt`
        + (result.bossDefeated ? ' — Boss defeated! Check Mail for kill cache.' : ''),
      );
      this.battleWon = null;
    } else {
      saveCurrentRealm(save);
    }

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← SECT HUB',
      () => this.scene.start(SCENE_KEYS.COVENANT_HUB),
      120,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'SECT BOSS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderBossInfo(save);
    this.renderFightButton(save);
  }

  private renderBossInfo(save: RealmSaveDataV3): void {
    const bossState = save.covenantState.bossState;
    const boss = CovBossSystem.getBossDefinition(save);
    const attemptsRemaining = CovBossSystem.getAttemptsRemaining(save);

    const nameText = this.add.text(CANVAS.WIDTH / 2, 68, boss?.name ?? 'Unknown Boss', {
      fontSize: '15px',
      color: '#ff6644',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(nameText);

    const mechanicText = this.add.text(
      CANVAS.WIDTH / 2,
      90,
      boss?.mechanicSummary ?? '',
      {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.infoTexts.push(mechanicText);

    const descText = this.add.text(
      CANVAS.WIDTH / 2,
      112,
      boss?.description ?? '',
      {
        fontSize: '9px',
        color: '#888899',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 560 },
      },
    ).setOrigin(0.5);
    this.infoTexts.push(descText);

    const hpPct = bossState.maxHp > 0
      ? Math.round((bossState.currentHp / bossState.maxHp) * 100)
      : 0;
    const hpBarWidth = 400;
    const hpBarX = CANVAS.WIDTH / 2 - hpBarWidth / 2;
    const hpBarY = 148;

    const hpBg = this.add.rectangle(
      CANVAS.WIDTH / 2,
      hpBarY,
      hpBarWidth,
      16,
      0x222233,
    );
    this.infoVisuals.push(hpBg);

    const fillWidth = Math.max(0, (bossState.currentHp / bossState.maxHp) * hpBarWidth);
    if (fillWidth > 0) {
      const hpFill = this.add.rectangle(
        hpBarX + fillWidth / 2,
        hpBarY,
        fillWidth,
        14,
        bossState.defeatedThisWeek ? 0x44aa44 : 0xcc4422,
      );
      this.infoVisuals.push(hpFill);
    }

    const hpLabel = this.add.text(
      CANVAS.WIDTH / 2,
      hpBarY,
      bossState.defeatedThisWeek
        ? 'DEFEATED'
        : `${bossState.currentHp.toLocaleString()} / ${bossState.maxHp.toLocaleString()} (${hpPct}%)`,
      {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.infoTexts.push(hpLabel);

    const statsLine = `Your damage this week: ${bossState.playerDamageThisWeek.toLocaleString()}  ·  Attempts: ${attemptsRemaining}/3`;
    const statsText = this.add.text(CANVAS.WIDTH / 2, 178, statsLine, {
      fontSize: '10px',
      color: '#ffcc44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(statsText);

    const npcHeader = this.add.text(CANVAS.WIDTH / 2, 204, 'TODAY\'S NPC CONTRIBUTION', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(npcHeader);

    const npcEntries = bossState.npcDamageToday;
    if (npcEntries.length === 0) {
      const emptyNpc = this.add.text(CANVAS.WIDTH / 2, 224, 'No NPC damage recorded today yet.', {
        fontSize: '9px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.infoTexts.push(emptyNpc);
    } else {
      const displayEntries = npcEntries.slice(0, 6);
      displayEntries.forEach((entry, index) => {
        const line = this.add.text(
          CANVAS.WIDTH / 2,
          222 + index * 16,
          `${entry.memberName} dealt ${entry.damage.toLocaleString()} damage today`,
          {
            fontSize: '9px',
            color: '#aaaacc',
            fontFamily: 'monospace',
          },
        ).setOrigin(0.5);
        this.infoTexts.push(line);
      });

      if (npcEntries.length > 6) {
        const more = this.add.text(
          CANVAS.WIDTH / 2,
          222 + 6 * 16,
          `+${npcEntries.length - 6} more members`,
          {
            fontSize: '8px',
            color: '#666688',
            fontFamily: 'monospace',
          },
        ).setOrigin(0.5);
        this.infoTexts.push(more);
      }
    }
  }

  private renderFightButton(save: RealmSaveDataV3): void {
    const validation = CovBossSystem.canAttempt(save);

    this.fightButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT - 56,
      'FIGHT BOSS',
      () => this.handleFight(),
      160,
      36,
    );
    this.fightButton.setEnabled(validation.canAttempt);

    if (!validation.canAttempt && validation.reason) {
      const hint = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 88, validation.reason, {
        fontSize: '10px',
        color: '#666688',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.infoTexts.push(hint);
    }
  }

  private handleFight(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const attempt = CovBossSystem.attemptBoss(save);
    if (!attempt.success) {
      this.showToast(attempt.reason ?? 'Cannot fight boss');
      return;
    }

    saveCurrentRealm(save);

    this.scene.start(SCENE_KEYS.FORMATION, {
      stageId: 'covenant_boss',
    });
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 120, message, {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
      align: 'center',
      wordWrap: { width: 520 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.backButton?.destroy();
    this.backButton = null;
    this.fightButton?.destroy();
    this.fightButton = null;

    for (const text of this.infoTexts) text.destroy();
    this.infoTexts.length = 0;

    for (const visual of this.infoVisuals) visual.destroy();
    this.infoVisuals.length = 0;
  }
}
