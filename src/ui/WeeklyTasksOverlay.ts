// src/ui/WeeklyTasksOverlay.ts
// Weekly missions panel rendered inside the Tasks overlay.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { WEEKLY_MISSIONS } from '../data/weeklyTasks';
import { loadCurrentRealm, saveCurrentRealm } from '../systems/SaveSystem';
import { WeeklyTaskSystem } from '../systems/WeeklyTaskSystem';
import type { RealmSaveDataV3 } from '../types';
import { ProgressBar } from './ProgressBar';

const PANEL_WIDTH = 620;
const ROW_HEIGHT = 56;
const BUTTON_HEIGHT = 36;

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class WeeklyTasksPanel {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly onRefresh: () => void;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private readonly progressBars: ProgressBar[] = [];
  private readonly rowTexts: Phaser.GameObjects.Text[] = [];

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    onRefresh: () => void,
  ) {
    this.scene = scene;
    this.container = container;
    this.onRefresh = onRefresh;
    this.render();
  }

  private addContainerButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 80,
  ): void {
    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, 0x3355aa);
    const text = this.scene.add.text(x, y, label, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    const zone = this.scene.add.zone(x, y, width, BUTTON_HEIGHT);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    this.container.add([bg, text, zone]);
    this.overlayButtons.push({ bg, label: text, zone });
  }

  private render(): void {
    const realm = loadCurrentRealm() as RealmSaveDataV3 | null;
    if (!realm) return;

    const startY = CANVAS.HEIGHT / 2 - 118;

    for (let i = 0; i < WEEKLY_MISSIONS.length; i += 1) {
      const definition = WEEKLY_MISSIONS[i];
      const view = WeeklyTaskSystem.getViewState(realm, definition);
      const y = startY + i * ROW_HEIGHT;
      const leftX = CANVAS.WIDTH / 2 - PANEL_WIDTH / 2 + 24;

      const nameColor = view.locked ? '#666688' : '#ffffff';
      const name = this.scene.add.text(leftX, y - 18, view.name, {
        fontSize: '11px',
        color: nameColor,
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(name);

      const descriptionColor = view.locked ? '#555566' : '#aaaacc';
      const description = this.scene.add.text(leftX, y - 2, view.description, {
        fontSize: '10px',
        color: descriptionColor,
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(description);

      if (view.locked) {
        const lockLabel = this.scene.add.text(
          CANVAS.WIDTH / 2 + 180,
          y,
          view.lockReason ?? 'Unlocks later',
          {
            fontSize: '9px',
            color: '#888899',
            fontFamily: 'monospace',
            wordWrap: { width: 150 },
            align: 'center',
          },
        ).setOrigin(0.5);
        this.rowTexts.push(lockLabel);
        this.container.add([name, description, lockLabel]);
        continue;
      }

      const progressText = this.scene.add.text(
        leftX,
        y + 14,
        `${view.currentProgress} / ${view.requiredProgress}`,
        {
          fontSize: '10px',
          color: '#aaaacc',
          fontFamily: 'monospace',
        },
      ).setOrigin(0, 0.5);
      this.rowTexts.push(progressText);

      const bar = new ProgressBar(
        this.scene,
        leftX + 70,
        y + 14,
        220,
        10,
        0x44cc88,
        0x333344,
      );
      bar.setProgress(view.currentProgress / view.requiredProgress);
      this.progressBars.push(bar);

      if (view.claimed) {
        const claimed = this.scene.add.text(CANVAS.WIDTH / 2 + 210, y, '✓ CLAIMED', {
          fontSize: '10px',
          color: '#44ff88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.rowTexts.push(claimed);
        this.container.add([name, description, progressText, claimed]);
      } else if (view.completed) {
        this.addContainerButton(
          CANVAS.WIDTH / 2 + 210,
          y,
          'CLAIM',
          () => {
            const save = loadCurrentRealm() as RealmSaveDataV3 | null;
            if (!save) return;
            WeeklyTaskSystem.claimMission(save, definition.id);
            saveCurrentRealm(save);
            this.onRefresh();
            this.clear();
            this.render();
          },
          80,
        );
        this.container.add([name, description, progressText]);
      } else {
        this.container.add([name, description, progressText]);
      }
    }
  }

  clear(): void {
    for (const button of this.overlayButtons) button.zone.off('pointerup');
    this.overlayButtons.length = 0;

    for (const bar of this.progressBars) bar.destroy();
    this.progressBars.length = 0;

    for (const text of this.rowTexts) text.destroy();
    this.rowTexts.length = 0;
  }

  destroy(): void {
    this.clear();
  }
}
