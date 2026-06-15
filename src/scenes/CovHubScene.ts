// src/scenes/CovHubScene.ts
// Sect hub — create/join when unaffiliated, overview when in a Sect (Section 25.1).

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { COVENANT_CONTRIBUTION } from '../data/covenantContribution';
import { SIMULATED_COVENANT_PRESET } from '../data/npcCovenantMembers';
import { CovSystem } from '../systems/CovSystem';
import { CovTechSystem } from '../systems/CovTechSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';
import { ModalBase } from '../ui/ModalBase';

const MAX_COVENANT_NAME_LENGTH = 24;

export class CovHubScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.COVENANT_HUB;

  private backButton: ButtonPrimary | null = null;
  private actionButtons: ButtonPrimary[] = [];
  private infoTexts: Phaser.GameObjects.Text[] = [];
  private createPanel: Phaser.GameObjects.Rectangle | null = null;
  private leaveModal: ModalBase | null = null;
  private nameInput: HTMLInputElement | null = null;
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: CovHubScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    CovSystem.syncDailyContribution(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.returnToHub(),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'SECT HUB', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (CovSystem.isInCovenant(save)) {
      this.renderInCovenantView(save);
    } else {
      this.renderNoCovenantView();
    }
  }

  private renderNoCovenantView(): void {
    this.clearActionContent();

    const lines = [
      'Your Sect is your guild — band together for shared rewards.',
      'Create your own Sect or join a simulated one to begin.',
    ];

    lines.forEach((line, index) => {
      const text = this.add.text(CANVAS.WIDTH / 2, 110 + index * 24, line, {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 560 },
      }).setOrigin(0.5);
      this.infoTexts.push(text);
    });

    const createButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      200,
      'CREATE SECT',
      () => this.enterCreateForm(),
      200,
    );

    const joinButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      260,
      `JOIN ${SIMULATED_COVENANT_PRESET.covName.toUpperCase()}`,
      () => this.handleJoinSimulated(),
      280,
    );

    this.actionButtons.push(createButton, joinButton);
  }

  private enterCreateForm(): void {
    this.clearActionContent();
    this.closeNameInput();

    this.createPanel = this.add.rectangle(
      CANVAS.WIDTH / 2,
      230,
      420,
      200,
      0x1a1a2e,
    );
    this.createPanel.setStrokeStyle(2, 0x44ccff);

    const title = this.add.text(CANVAS.WIDTH / 2, 150, 'NAME YOUR SECT', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(title);

    const hint = this.add.text(CANVAS.WIDTH / 2, 172, 'Choose a name (2–24 characters)', {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(hint);

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = MAX_COVENANT_NAME_LENGTH;
    this.nameInput.placeholder = 'Sect name';
    this.nameInput.style.position = 'absolute';
    this.nameInput.style.left = '50%';
    this.nameInput.style.top = '50%';
    this.nameInput.style.transform = 'translate(-50%, 20px)';
    this.nameInput.style.width = '280px';
    this.nameInput.style.padding = '8px';
    this.nameInput.style.fontSize = '16px';
    this.nameInput.style.fontFamily = 'monospace';
    this.nameInput.style.textAlign = 'center';
    this.nameInput.style.zIndex = '1000';

    const parent = document.getElementById('game-container') ?? document.body;
    parent.appendChild(this.nameInput);
    this.nameInput.focus();

    const confirmButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      300,
      'CONFIRM CREATE',
      () => this.handleCreate(),
      180,
    );

    const cancelButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      340,
      'CANCEL',
      () => this.cancelCreateForm(),
      120,
    );

    this.actionButtons.push(confirmButton, cancelButton);
  }

  private cancelCreateForm(): void {
    this.closeNameInput();
    this.renderNoCovenantView();
  }

  private renderInCovenantView(save: RealmSaveDataV3): void {
    this.clearActionContent();
    const state = CovSystem.getState(save);
    const progress = CovSystem.getLevelProgress(save);
    const availability = CovSystem.getContributionAvailability(save);
    const techLabels = CovTechSystem.formatActiveTechLabels(save);

    const nameText = this.add.text(CANVAS.WIDTH / 2, 68, state.covName ?? 'Sect', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(nameText);

    const levelLine = progress.isMaxLevel
      ? `Level ${state.covLevel}  ·  XP ${state.covXP.toLocaleString()} (MAX)`
      : `Level ${state.covLevel}  ·  XP ${state.covXP.toLocaleString()}  (${progress.currentInLevel}/${progress.requiredForNext} to Lv${state.covLevel + 1})`;
    const levelText = this.add.text(CANVAS.WIDTH / 2, 92, levelLine, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(levelText);

    const memberText = this.add.text(
      CANVAS.WIDTH / 2,
      112,
      `Members ${state.memberCount}  ·  Sect Coins ${EconomySystem.getCurrencyBalance(save, 'covenant_coin')}`,
      {
        fontSize: '10px',
        color: '#888899',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.infoTexts.push(memberText);

    const techHeader = this.add.text(CANVAS.WIDTH / 2, 132, 'ACTIVE TECH', {
      fontSize: '10px',
      color: '#44ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.infoTexts.push(techHeader);

    const techBody = techLabels.length > 0
      ? techLabels.slice(0, 4).join('  ·  ')
      : 'None yet — level up to unlock';
    const techText = this.add.text(CANVAS.WIDTH / 2, 150, techBody, {
      fontSize: '9px',
      color: '#aaaacc',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 600 },
    }).setOrigin(0.5);
    this.infoTexts.push(techText);

    const goldButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 - 150,
      198,
      `GOLD (${COVENANT_CONTRIBUTION.GOLD_COST.toLocaleString()})`,
      () => this.handleContributeGold(),
      200,
      30,
    );
    goldButton.setEnabled(availability.canContributeGold);

    const crystalButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 + 150,
      198,
      `CRYSTALS (${COVENANT_CONTRIBUTION.CRYSTAL_COST})`,
      () => this.handleContributeCrystal(),
      200,
      30,
    );
    crystalButton.setEnabled(availability.canContributeCrystal);

    if (!availability.canContributeGold && availability.goldReason) {
      const goldHint = this.add.text(CANVAS.WIDTH / 2 - 150, 218, availability.goldReason, {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 190 },
      }).setOrigin(0.5);
      this.infoTexts.push(goldHint);
    }

    if (!availability.canContributeCrystal && availability.crystalReason) {
      const crystalHint = this.add.text(CANVAS.WIDTH / 2 + 150, 218, availability.crystalReason, {
        fontSize: '8px',
        color: '#666688',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: 190 },
      }).setOrigin(0.5);
      this.infoTexts.push(crystalHint);
    }

    const membersButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 - 160,
      268,
      'VIEW MEMBERS',
      () => this.scene.start(SCENE_KEYS.COVENANT_MEMBER),
      140,
      30,
    );

    const shopButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      268,
      'SECT SHOP',
      () => this.scene.start(SCENE_KEYS.COVENANT_SHOP),
      120,
      30,
    );

    const leaveButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 + 160,
      268,
      'LEAVE SECT',
      () => this.confirmLeave(),
      120,
      30,
    );

    this.actionButtons.push(goldButton, crystalButton, membersButton, shopButton, leaveButton);
  }

  private handleContributeGold(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = CovSystem.contributeGold(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'Contribution failed');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`+${result.coinsGranted} Sect Coins, +${result.xpGranted} Sect XP`);
    this.scene.restart();
  }

  private handleContributeCrystal(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = CovSystem.contributeCrystals(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'Contribution failed');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`+${result.coinsGranted} Sect Coins, +${result.xpGranted} Sect XP`);
    this.scene.restart();
  }

  private handleCreate(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save || !this.nameInput) return;

    const result = CovSystem.createCovenant(save, this.nameInput.value);
    if (!result.success) {
      this.showToast(result.reason ?? 'Create failed');
      return;
    }

    saveCurrentRealm(save);
    this.closeNameInput();
    this.scene.restart();
  }

  private handleJoinSimulated(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = CovSystem.joinSimulatedCovenant(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'Join failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
  }

  private confirmLeave(): void {
    this.leaveModal?.destroy();
    this.leaveModal = new ModalBase(
      this,
      'Leave Sect?',
      'You will lose access to Sect rewards until you create or join again.',
      {
        confirmLabel: 'LEAVE',
        cancelLabel: 'STAY',
        onConfirm: () => {
          this.leaveModal?.destroy();
          this.leaveModal = null;
          this.handleLeave();
        },
        onCancel: () => {
          this.leaveModal?.destroy();
          this.leaveModal = null;
        },
      },
    );
  }

  private handleLeave(): void {
    const save = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!save) return;

    const result = CovSystem.leaveCovenant(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'Leave failed');
      return;
    }

    saveCurrentRealm(save);
    this.scene.restart();
  }

  private returnToHub(): void {
    this.closeNameInput();
    this.scene.start(SCENE_KEYS.HUB);
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 60, message, {
      fontSize: '12px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(UI.TOAST_DURATION_MS, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
      this.toastTimer = null;
    });
  }

  private closeNameInput(): void {
    this.nameInput?.remove();
    this.nameInput = null;
  }

  private clearActionContent(): void {
    for (const text of this.infoTexts) text.destroy();
    this.infoTexts.length = 0;

    for (const button of this.actionButtons) button.destroy();
    this.actionButtons.length = 0;

    this.createPanel?.destroy();
    this.createPanel = null;
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.toastLabel = null;
    this.leaveModal?.destroy();
    this.leaveModal = null;
    this.closeNameInput();
    this.backButton?.destroy();
    this.backButton = null;
    this.clearActionContent();
  }
}
