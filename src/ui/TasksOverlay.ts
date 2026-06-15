// src/ui/TasksOverlay.ts
// Daily and weekly tasks overlay launched from Hub.

import Phaser from 'phaser';
import { CANVAS } from '../constants/gameConfig';
import { DAILY_TASKS } from '../data/tasks';
import * as TaskSystem from '../systems/TaskSystem';
import { ProgressBar } from './ProgressBar';
import { createOverlayDim } from './HubOverlayPanel';
import { WeeklyTasksPanel } from './WeeklyTasksOverlay';

const PANEL_WIDTH = 620;
const PANEL_HEIGHT_DAILY = 320;
const PANEL_HEIGHT_WEEKLY = 460;
const ROW_HEIGHT = 64;
const BUTTON_HEIGHT = 36;
const OVERLAY_DEPTH = 100;

type TasksTab = 'daily' | 'weekly';

interface OverlayButtonParts {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class TasksOverlay {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private readonly overlayButtons: OverlayButtonParts[] = [];
  private readonly progressBars: ProgressBar[] = [];
  private readonly rowTexts: Phaser.GameObjects.Text[] = [];
  private weeklyPanel: WeeklyTasksPanel | null = null;
  private activeTab: TasksTab = 'daily';
  private panel: Phaser.GameObjects.Rectangle | null = null;
  private title: Phaser.GameObjects.Text | null = null;
  private readonly onClose: () => void;
  private readonly onRefresh: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void, onRefresh: () => void) {
    this.scene = scene;
    this.onClose = onClose;
    this.onRefresh = onRefresh;
    this.render();
  }

  private render(): void {
    this.destroyContent();

    this.container = this.scene.add.container(0, 0).setDepth(OVERLAY_DEPTH);
    this.container.setSize(CANVAS.WIDTH, CANVAS.HEIGHT);

    const panelHeight = this.activeTab === 'daily' ? PANEL_HEIGHT_DAILY : PANEL_HEIGHT_WEEKLY;

    const dim = createOverlayDim(this.scene);

    this.panel = this.scene.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      PANEL_WIDTH,
      panelHeight,
      0x1a1a2e,
    );
    this.panel.setStrokeStyle(2, 0x44ccff);

    this.title = this.scene.add.text(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 - panelHeight / 2 + 24,
      this.activeTab === 'daily' ? 'DAILY TASKS' : 'WEEKLY MISSIONS',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.container.add([dim, this.panel, this.title]);
    this.drawTabs(panelHeight);

    if (this.activeTab === 'daily') {
      this.drawDailyTasks(panelHeight);
    } else if (this.container) {
      this.weeklyPanel = new WeeklyTasksPanel(this.scene, this.container, () => {
        this.onRefresh();
        this.render();
      });
    }

    this.addContainerButton(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2 + panelHeight / 2 - 28,
      'CLOSE',
      () => this.close(),
      100,
    );
  }

  private drawTabs(panelHeight: number): void {
    const tabY = CANVAS.HEIGHT / 2 - panelHeight / 2 + 52;
    const dailyActive = this.activeTab === 'daily';
    const weeklyActive = this.activeTab === 'weekly';

    this.addContainerButton(
      CANVAS.WIDTH / 2 - 70,
      tabY,
      'DAILY',
      () => {
        if (this.activeTab === 'daily') return;
        this.activeTab = 'daily';
        this.render();
      },
      90,
      dailyActive ? 0x4466aa : 0x223344,
    );

    this.addContainerButton(
      CANVAS.WIDTH / 2 + 70,
      tabY,
      'WEEKLY',
      () => {
        if (this.activeTab === 'weekly') return;
        this.activeTab = 'weekly';
        this.render();
      },
      90,
      weeklyActive ? 0x4466aa : 0x223344,
    );
  }

  private addContainerButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 80,
    fillColor = 0x3355aa,
  ): void {
    if (!this.container) return;

    const bg = this.scene.add.rectangle(x, y, width, BUTTON_HEIGHT, fillColor);
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

  private drawDailyTasks(panelHeight: number): void {
    const tasks = TaskSystem.getDailyTasks();
    const startY = CANVAS.HEIGHT / 2 - panelHeight / 2 + 100;

    for (let i = 0; i < tasks.length; i += 1) {
      const taskState = tasks[i];
      const definition = DAILY_TASKS.find((task) => task.id === taskState.taskId);
      if (!definition) continue;

      const y = startY + i * ROW_HEIGHT;
      const leftX = CANVAS.WIDTH / 2 - PANEL_WIDTH / 2 + 24;

      const description = this.scene.add.text(leftX, y - 14, definition.description, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.rowTexts.push(description);

      const progressText = this.scene.add.text(
        leftX,
        y + 6,
        `${taskState.currentProgress} / ${definition.requiredProgress}`,
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
        y + 6,
        220,
        10,
        0x44cc88,
        0x333344,
      );
      bar.setProgress(taskState.currentProgress / definition.requiredProgress);
      this.progressBars.push(bar);

      const isComplete = taskState.currentProgress >= definition.requiredProgress;

      if (taskState.claimed) {
        const claimed = this.scene.add.text(CANVAS.WIDTH / 2 + 210, y, '✓ CLAIMED', {
          fontSize: '10px',
          color: '#44ff88',
          fontFamily: 'monospace',
        }).setOrigin(0.5);
        this.rowTexts.push(claimed);
        this.container?.add(claimed);
      } else if (isComplete) {
        this.addContainerButton(
          CANVAS.WIDTH / 2 + 210,
          y,
          'CLAIM',
          () => {
            TaskSystem.claimTask(taskState.taskId);
            this.onRefresh();
            this.render();
          },
          80,
        );
      }

      this.container?.add([description, progressText]);
    }
  }

  private close(): void {
    this.destroy();
    this.onClose();
  }

  private destroyContent(): void {
    this.weeklyPanel?.destroy();
    this.weeklyPanel = null;

    for (const button of this.overlayButtons) button.zone.off('pointerup');
    this.overlayButtons.length = 0;

    for (const bar of this.progressBars) bar.destroy();
    this.progressBars.length = 0;

    this.container?.destroy(true);
    this.container = null;
    this.panel = null;
    this.title = null;
    this.rowTexts.length = 0;
  }

  destroy(): void {
    this.destroyContent();
  }
}
