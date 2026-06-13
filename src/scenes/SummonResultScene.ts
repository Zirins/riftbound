// src/scenes/SummonResultScene.ts
// Reveal pulled heroes with staggered card animation.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { HEROES_DATA } from '../data/heroes';
import type { HeroRarity, SummonResult } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const REVEAL_INTERVAL_MS = 400;

const RARITY_COLORS: Record<HeroRarity, string> = {
  uncommon: '#888888',
  rare: '#4488ff',
  epic: '#aa44ff',
  legendary: '#ffcc22',
};

export class SummonResultScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.SUMMON_RESULT;

  private results: SummonResult[] = [];
  private revealIndex = 0;
  private revealTimer: Phaser.Time.TimerEvent | null = null;
  private summaryLabel: Phaser.GameObjects.Text | null = null;
  private doneButton: ButtonPrimary | null = null;
  private againButton: ButtonPrimary | null = null;
  private readonly cardObjects: Phaser.GameObjects.GameObject[] = [];
  private flashOverlay: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super({ key: SummonResultScene.KEY });
  }

  init(data: { results?: SummonResult[] }): void {
    this.results = data.results ?? [];
    this.revealIndex = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.add.text(CANVAS.WIDTH / 2, 28, 'SUMMON RESULTS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.summaryLabel = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT - 70, '', {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.flashOverlay = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HEIGHT,
      0xffffff,
      0,
    ).setDepth(500);

    this.againButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 - 120,
      CANVAS.HEIGHT - 36,
      'SUMMON AGAIN',
      () => this.scene.start(SCENE_KEYS.SUMMON_TEMPLE),
      180,
    );

    this.doneButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 + 120,
      CANVAS.HEIGHT - 36,
      'DONE',
      () => this.scene.start(SCENE_KEYS.SUMMON_TEMPLE),
      120,
    );

    if (this.results.length === 0) {
      this.summaryLabel.setText('No results.');
      return;
    }

    this.revealNextCard();
    if (this.results.length > 1) {
      this.revealTimer = this.time.addEvent({
        delay: REVEAL_INTERVAL_MS,
        callback: () => this.revealNextCard(),
        loop: true,
      });
    }
  }

  shutdown(): void {
    this.revealTimer?.remove();
    this.revealTimer = null;
    for (const obj of this.cardObjects) obj.destroy();
    this.cardObjects.length = 0;
    this.summaryLabel?.destroy();
    this.doneButton?.destroy();
    this.againButton?.destroy();
    this.flashOverlay?.destroy();
    this.summaryLabel = null;
    this.doneButton = null;
    this.againButton = null;
    this.flashOverlay = null;
  }

  private revealNextCard(): void {
    if (this.revealIndex >= this.results.length) {
      this.revealTimer?.remove();
      this.revealTimer = null;
      this.updateSummary();
      return;
    }

    const result = this.results[this.revealIndex];
    this.revealIndex += 1;
    this.renderCard(result, this.revealIndex - 1, this.results.length);

    if (result.rarity === 'epic' || result.rarity === 'legendary') {
      this.playRarityFlash();
    }
  }

  private renderCard(result: SummonResult, index: number, total: number): void {
    const hero = HEROES_DATA.find((entry) => entry.id === result.heroId);
    const spacing = Math.min(72, (CANVAS.WIDTH - 80) / Math.max(total, 1));
    const startX = CANVAS.WIDTH / 2 - ((total - 1) * spacing) / 2;
    const x = startX + index * spacing;
    const y = CANVAS.HEIGHT / 2 - 10;

    const circle = this.add.circle(x, y, 22, hero?.color ?? 0x444455);
    const name = this.add.text(x, y + 34, hero?.name ?? result.heroId, {
      fontSize: '9px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const rarityLine = this.add.text(x, y + 48, result.rarity.toUpperCase(), {
      fontSize: '8px',
      color: RARITY_COLORS[result.rarity],
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const status = result.isNew
      ? 'NEW'
      : `+${result.shardsGranted} shards`;
    const statusText = this.add.text(x, y + 60, status, {
      fontSize: '8px',
      color: result.isNew ? '#44ff88' : '#ffaa44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.cardObjects.push(circle, name, rarityLine, statusText);
  }

  private playRarityFlash(): void {
    if (!this.flashOverlay) return;
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: 0, to: 0.85 },
      duration: 75,
      yoyo: true,
      hold: 0,
      onComplete: () => this.flashOverlay?.setAlpha(0),
    });
  }

  private updateSummary(): void {
    const newCount = this.results.filter((r) => r.isNew).length;
    const dupeCount = this.results.length - newCount;
    const totalShards = this.results.reduce((sum, r) => sum + r.shardsGranted, 0);

    let summary = `${newCount} new hero${newCount === 1 ? '' : 'es'}`;
    if (dupeCount > 0) {
      summary += `, ${dupeCount} duplicate${dupeCount === 1 ? '' : 's'} (${totalShards} shards added)`;
    }
    this.summaryLabel?.setText(summary);
  }
}
