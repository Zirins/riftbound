// src/scenes/RiftSeasonScene.ts
// Rift Season battle pass — XP track, free/premium claims (Section 30).

import Phaser from 'phaser';
import { CANVAS, RIFT_SEASON, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { getRiftSeasonTierRewards, getXpRequiredForTier } from '../data/riftSeasonRewards';
import { getUnlockMessage, isUnlocked } from '../systems/FeatureUnlockSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { RiftSeasonSystem } from '../systems/RiftSeasonSystem';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import type { RealmSaveDataV3, RewardBundle } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

function formatRewardBundle(bundle: RewardBundle): string {
  const parts: string[] = [];

  for (const currency of bundle.currencies ?? []) {
    const label = currency.type.replace(/_/g, ' ');
    parts.push(`${currency.amount} ${label}`);
  }

  for (const item of bundle.items ?? []) {
    parts.push(`${item.quantity}× ${item.itemId.replace(/_/g, ' ')}`);
  }

  return parts.length > 0 ? parts.join(', ') : '—';
}

export class RiftSeasonScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.RIFT_SEASON;

  private backButton: ButtonPrimary | null = null;
  private actionButtons: ButtonPrimary[] = [];
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private toastLabel: Phaser.GameObjects.Text | null = null;
  private toastTimer: Phaser.Time.TimerEvent | null = null;
  private selectedTier = 1;

  constructor() {
    super({ key: RiftSeasonScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    if (!isUnlocked('RIFT_SEASON')) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const realm = loadCurrentRealm();
    if (!realm) {
      this.scene.start(SCENE_KEYS.HUB);
      return;
    }

    const save = realm as RealmSaveDataV3;
    RiftSeasonSystem.ensureSeasonState(save);
    this.selectedTier = Math.max(1, RiftSeasonSystem.getCurrentTier(save) || 1);
    saveCurrentRealm(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← HUB',
      () => this.scene.start(SCENE_KEYS.HUB),
      100,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'RIFT SEASON', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderSeasonHeader(save);
    this.renderTierPanel(save);
    this.renderPremiumUnlock(save);
  }

  private renderSeasonHeader(save: RealmSaveDataV3): void {
    const xp = save.riftSeasonState.currentXp;
    const maxXp = RIFT_SEASON.MAX_XP;
    const tier = RiftSeasonSystem.getCurrentTier(save);
    const seasonDay = RiftSeasonSystem.getSeasonDay(save);
    const daysLeft = RiftSeasonSystem.getDaysRemaining(save);
    const voidGems = EconomySystem.getCurrencyBalance(save, 'void_gem');

    const header = this.add.text(
      CANVAS.WIDTH / 2,
      58,
      `Season XP: ${xp} / ${maxXp}  ·  Tier ${tier}  ·  Day ${seasonDay}/${RIFT_SEASON.SEASON_DURATION_DAYS} (${daysLeft}d left)  ·  Void Gems: ${voidGems}`,
      {
        fontSize: '9px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.rowTexts.push(header);

    const barWidth = 500;
    const barX = CANVAS.WIDTH / 2 - barWidth / 2;
    const barY = 76;
    const fillWidth = Math.floor(barWidth * (xp / maxXp));

    this.add.rectangle(barX, barY, barWidth, 8, 0x333355).setOrigin(0, 0.5);
    if (fillWidth > 0) {
      this.add.rectangle(barX, barY, fillWidth, 8, 0x44ccff).setOrigin(0, 0.5);
    }
  }

  private renderTierPanel(save: RealmSaveDataV3): void {
    const prev = new ButtonPrimary(
      this,
      80,
      110,
      '◀',
      () => {
        this.selectedTier = Math.max(1, this.selectedTier - 1);
        this.scene.restart();
      },
      40,
      28,
    );
    this.actionButtons.push(prev);

    const next = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 80,
      110,
      '▶',
      () => {
        this.selectedTier = Math.min(RIFT_SEASON.TOTAL_TIERS, this.selectedTier + 1);
        this.scene.restart();
      },
      40,
      28,
    );
    this.actionButtons.push(next);

    const tierTitle = this.add.text(
      CANVAS.WIDTH / 2,
      110,
      `TIER ${this.selectedTier}  (requires ${getXpRequiredForTier(this.selectedTier)} XP)`,
      {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.rowTexts.push(tierTitle);

    const currentTier = RiftSeasonSystem.getCurrentTier(save);
    const hasPremium = save.riftSeasonState.premiumUnlocked;
    const claimableFree = Array.from({ length: currentTier }, (_, i) => i + 1)
      .some((tier) => !save.riftSeasonState.claimedFreeTiers.includes(tier));
    const claimablePremium = hasPremium
      && Array.from({ length: currentTier }, (_, i) => i + 1)
        .some((tier) => !save.riftSeasonState.claimedPremiumTiers.includes(tier));

    const claimAll = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 110,
      72,
      (claimableFree || claimablePremium) ? 'CLAIM ALL' : 'NO CLAIMS',
      () => this.handleClaimAll(),
      160,
      28,
    );
    if (!claimableFree && !claimablePremium) claimAll.setEnabled(false);
    this.actionButtons.push(claimAll);

    const rewards = getRiftSeasonTierRewards(this.selectedTier);
    if (!rewards) return;

    const xp = save.riftSeasonState.currentXp;
    const requiredXp = getXpRequiredForTier(this.selectedTier);
    const unlocked = xp >= requiredXp;
    const freeClaimed = save.riftSeasonState.claimedFreeTiers.includes(this.selectedTier);
    const premiumClaimed = save.riftSeasonState.claimedPremiumTiers.includes(this.selectedTier);

    const freeLine = this.add.text(60, 145, `FREE: ${formatRewardBundle(rewards.free)}`, {
      fontSize: '10px',
      color: freeClaimed ? '#666688' : '#aaddff',
      fontFamily: 'monospace',
      wordWrap: { width: 520 },
    });
    this.rowTexts.push(freeLine);

    const premiumLine = this.add.text(60, 175, `PREMIUM: ${formatRewardBundle(rewards.premium)}`, {
      fontSize: '10px',
      color: premiumClaimed ? '#666688' : '#ffcc44',
      fontFamily: 'monospace',
      wordWrap: { width: 520 },
    });
    this.rowTexts.push(premiumLine);

    const freeClaim = new ButtonPrimary(
      this,
      180,
      220,
      freeClaimed ? 'FREE CLAIMED' : unlocked ? 'CLAIM FREE' : 'LOCKED',
      () => this.handleClaimFree(),
      140,
      32,
    );
    if (freeClaimed || !unlocked) {
      freeClaim.setText(freeClaimed ? 'FREE CLAIMED' : 'LOCKED');
    }
    this.actionButtons.push(freeClaim);

    const premiumClaim = new ButtonPrimary(
      this,
      420,
      220,
      premiumClaimed ? 'PREM CLAIMED' : !hasPremium ? 'NO PREMIUM' : unlocked ? 'CLAIM PREMIUM' : 'LOCKED',
      () => this.handleClaimPremium(),
      150,
      32,
    );
    this.actionButtons.push(premiumClaim);

    const trackHint = this.add.text(
      CANVAS.WIDTH / 2,
      260,
      hasPremium
        ? 'Premium track unlocked — claim richer rewards at each tier.'
        : `Unlock premium for ${RIFT_SEASON.PREMIUM_TRACK_COST_VOID_GEMS} Void Gems below.`,
      {
        fontSize: '9px',
        color: '#888899',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);
    this.rowTexts.push(trackHint);
  }

  private renderPremiumUnlock(save: RealmSaveDataV3): void {
    if (save.riftSeasonState.premiumUnlocked) {
      const label = this.add.text(CANVAS.WIDTH / 2, 310, '✦ Premium track active this season', {
        fontSize: '11px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.rowTexts.push(label);
      return;
    }

    const unlock = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2,
      310,
      `UNLOCK PREMIUM — ${RIFT_SEASON.PREMIUM_TRACK_COST_VOID_GEMS} Void Gems`,
      () => this.handlePurchasePremium(),
      320,
      36,
    );
    this.actionButtons.push(unlock);
  }

  private handleClaimFree(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = RiftSeasonSystem.claimFreeTier(save, this.selectedTier);
    if (!result.success) {
      this.showToast(result.reason ?? 'Claim failed');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`Tier ${this.selectedTier} free reward claimed!`);
    this.scene.restart();
  }

  private handleClaimPremium(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = RiftSeasonSystem.claimPremiumTier(save, this.selectedTier);
    if (!result.success) {
      this.showToast(result.reason ?? 'Claim failed');
      return;
    }

    saveCurrentRealm(save);
    this.showToast(`Tier ${this.selectedTier} premium reward claimed!`);
    this.scene.restart();
  }

  private handlePurchasePremium(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = RiftSeasonSystem.purchasePremium(save);
    if (!result.success) {
      this.showToast(result.reason ?? 'Purchase failed');
      return;
    }

    saveCurrentRealm(save);
    this.showToast('Premium track unlocked!');
    this.scene.restart();
  }

  private handleClaimAll(): void {
    const save = this.loadSave();
    if (!save) return;

    const result = RiftSeasonSystem.claimAllAvailableTiers(save);
    if (result.claimedFree + result.claimedPremium <= 0) {
      this.showToast('No claimable tiers');
      return;
    }

    saveCurrentRealm(save);
    if (result.claimedPremium > 0) {
      this.showToast(`Claimed ${result.claimedFree} free and ${result.claimedPremium} premium tier reward(s)!`);
    } else {
      this.showToast(`Claimed ${result.claimedFree} free tier reward(s)!`);
    }
    this.scene.restart();
  }

  private loadSave(): RealmSaveDataV3 | null {
    const realm = loadCurrentRealm();
    return realm ? (realm as RealmSaveDataV3) : null;
  }

  private showToast(message: string): void {
    this.toastTimer?.remove();
    this.toastLabel?.destroy();

    this.toastLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 24, message, {
      fontSize: '11px',
      color: '#ffcc44',
      fontFamily: 'monospace',
      backgroundColor: '#222233',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.toastTimer = this.time.delayedCall(2200, () => {
      this.toastLabel?.destroy();
      this.toastLabel = null;
    });
  }

  shutdown(): void {
    this.toastTimer?.remove();
    this.toastTimer = null;
    this.toastLabel?.destroy();
    this.backButton?.destroy();
    for (const button of this.actionButtons) button.destroy();
    for (const text of this.rowTexts) text.destroy();
    this.actionButtons = [];
    this.rowTexts = [];
    this.backButton = null;
    this.toastLabel = null;
  }
}

/** Hub entry guard — shows unlock toast when gated. */
export function tryOpenRiftSeasonScene(scene: Phaser.Scene): void {
  if (!isUnlocked('RIFT_SEASON')) {
    return;
  }
  scene.scene.start(SCENE_KEYS.RIFT_SEASON);
}

export function getRiftSeasonUnlockToast(): string {
  return getUnlockMessage('RIFT_SEASON');
}
