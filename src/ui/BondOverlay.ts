// src/ui/BondOverlay.ts
// Resonance Bond list with progress for RosterScene.

import Phaser from 'phaser';
import { BondSystem } from '../systems/BondSystem';
import { formatModifierSummary } from '../data/bonds';
import type { ActiveBond, RealmSaveDataV3 } from '../types';

const VIEWPORT_X = 40;
const VIEWPORT_Y = 96;
const VIEWPORT_WIDTH = 760;
const VIEWPORT_HEIGHT = 250;
const LINE_HEIGHT = 16;

export class BondOverlay {
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly contentContainer: Phaser.GameObjects.Container;
  private readonly summaryLabel: Phaser.GameObjects.Text;
  private readonly scrollZone: Phaser.GameObjects.Zone;
  private readonly bondLabels: Phaser.GameObjects.Text[] = [];
  private scrollOffset = 0;
  private maxScroll = 0;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private isDragging = false;

  constructor(
    private readonly scene: Phaser.Scene,
  ) {
    this.summaryLabel = scene.add.text(VIEWPORT_X, 72, '', {
      fontSize: '10px',
      color: '#ffcc66',
      fontFamily: 'monospace',
      wordWrap: { width: VIEWPORT_WIDTH },
    });

    this.maskShape = scene.make.graphics({ x: 0, y: 0 });
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(VIEWPORT_X, VIEWPORT_Y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    const mask = this.maskShape.createGeometryMask();

    this.contentContainer = scene.add.container(0, 0);
    this.contentContainer.setMask(mask);

    this.scrollZone = scene.add.zone(
      VIEWPORT_X + VIEWPORT_WIDTH / 2,
      VIEWPORT_Y + VIEWPORT_HEIGHT / 2,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
    );
    this.scrollZone.setInteractive({ useHandCursor: true });
    this.scrollZone.on('pointerdown', this.onPointerDown, this);
    this.scrollZone.on('pointermove', this.onPointerMove, this);
    this.scrollZone.on('pointerup', this.onPointerUp, this);
    this.scrollZone.on('pointerout', this.onPointerUp, this);
  }

  refresh(save: RealmSaveDataV3): void {
    const modifiers = BondSystem.computeGlobalModifiers(save);
    const bonds = BondSystem.buildBondCatalog(save);
    this.summaryLabel.setText(
      `Global bonuses: ${formatModifierSummary(modifiers)}`,
    );

    this.contentContainer.removeAll(true);
    this.bondLabels.length = 0;

    let y = VIEWPORT_Y;
    const grouped: Record<ActiveBond['type'], ActiveBond[]> = {
      faction: [],
      class: [],
      collection: [],
      pair: [],
    };
    for (const bond of bonds) {
      grouped[bond.type].push(bond);
    }

    const sections: { title: string; entries: ActiveBond[] }[] = [
      { title: '— Faction Bonds —', entries: grouped.faction },
      { title: '— Class Bonds —', entries: grouped.class },
      { title: '— Collection Milestones —', entries: grouped.collection },
      { title: '— Pair Bonds —', entries: grouped.pair },
    ];

    for (const section of sections) {
      y = this.addLine(section.title, y, '#aaaaaa', '10px');
      for (const bond of section.entries) {
        y = this.addBondLine(bond, y);
      }
      y += 6;
    }

    this.maxScroll = Math.max(0, y - (VIEWPORT_Y + VIEWPORT_HEIGHT));
    this.scrollOffset = Math.min(this.scrollOffset, this.maxScroll);
    this.applyScroll();
  }

  setVisible(visible: boolean): void {
    this.summaryLabel.setVisible(visible);
    this.contentContainer.setVisible(visible);
    this.maskShape.setVisible(visible);
    this.scrollZone.setVisible(visible);
    if (visible) {
      this.scrollZone.setInteractive({ useHandCursor: true });
    } else {
      this.scrollZone.disableInteractive();
    }
  }

  destroy(): void {
    this.scrollZone.off('pointerdown', this.onPointerDown, this);
    this.scrollZone.off('pointermove', this.onPointerMove, this);
    this.scrollZone.off('pointerup', this.onPointerUp, this);
    this.scrollZone.off('pointerout', this.onPointerUp, this);
    this.scrollZone.destroy();
    this.summaryLabel.destroy();
    this.maskShape.destroy();
    this.contentContainer.destroy();
    this.bondLabels.length = 0;
  }

  private addLine(
    text: string,
    y: number,
    color: string,
    fontSize = '9px',
  ): number {
    const label = this.scene.add.text(VIEWPORT_X, y, text, {
      fontSize,
      color,
      fontFamily: 'monospace',
    });
    label.setData('baseY', y);
    this.contentContainer.add(label);
    this.bondLabels.push(label);
    return y + LINE_HEIGHT;
  }

  private addBondLine(bond: ActiveBond, y: number): number {
    const status = bond.isActive ? 'ACTIVE' : 'LOCKED';
    const bonus = formatModifierSummary(bond.modifiers);
    const globalTag = bond.contributesGlobally ? ' ★' : '';
    const text = `[${status}] ${bond.name}${globalTag} — ${bond.currentCount}/${bond.requiredCount} — ${bonus}`;
    const color = bond.isActive ? '#88ffaa' : '#777788';
    return this.addLine(text, y, color);
  }

  private applyScroll(): void {
    for (const label of this.bondLabels) {
      const baseY = label.getData('baseY') as number;
      label.setY(baseY - this.scrollOffset);
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.dragStartY = pointer.y;
    this.dragStartOffset = this.scrollOffset;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;
    const delta = this.dragStartY - pointer.y;
    this.scrollOffset = Phaser.Math.Clamp(this.dragStartOffset + delta, 0, this.maxScroll);
    this.applyScroll();
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }
}
