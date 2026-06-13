// src/ui/HorizontalDragScroll.ts
// Masked horizontal strip with touch/mouse drag-to-scroll and tap-vs-drag threshold.

import Phaser from 'phaser';

const DRAG_THRESHOLD_PX = 5;

export class HorizontalDragScroll {
  readonly container: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly viewportX: number;
  private readonly viewportY: number;
  private readonly viewportWidth: number;
  private readonly viewportHeight: number;
  private readonly maskGraphics: Phaser.GameObjects.Graphics;

  private scrollOffset = 0;
  private maxScroll = 0;
  private activePointerId: number | null = null;
  private pointerDownX = 0;
  private scrollAtPointerDown = 0;
  private isDragging = false;
  private suppressTap = false;

  private readonly onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerUp: (pointer: Phaser.Input.Pointer) => void;

  constructor(
    scene: Phaser.Scene,
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number,
  ) {
    this.scene = scene;
    this.viewportX = viewportX;
    this.viewportY = viewportY;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    this.container = scene.add.container(0, 0);

    this.maskGraphics = scene.make.graphics({ x: 0, y: 0 });
    this.maskGraphics.setVisible(false);
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);
    this.container.setMask(this.maskGraphics.createGeometryMask());

    this.onPointerDown = (pointer) => this.handlePointerDown(pointer);
    this.onPointerMove = (pointer) => this.handlePointerMove(pointer);
    this.onPointerUp = (pointer) => this.handlePointerUp(pointer);

    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
  }

  setContentWidth(contentWidth: number): void {
    this.maxScroll = Math.max(0, contentWidth - this.viewportWidth);
    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);
    this.applyScrollOffset();
  }

  /** Returns true once after a drag gesture — call from tap handlers to skip accidental taps. */
  shouldConsumeTap(): boolean {
    if (!this.suppressTap) return false;
    this.suppressTap = false;
    return true;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.maskGraphics.destroy();
    this.container.destroy();
  }

  private isInsideViewport(pointer: Phaser.Input.Pointer): boolean {
    return pointer.x >= this.viewportX
      && pointer.x <= this.viewportX + this.viewportWidth
      && pointer.y >= this.viewportY
      && pointer.y <= this.viewportY + this.viewportHeight;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isInsideViewport(pointer)) return;
    this.activePointerId = pointer.id;
    this.pointerDownX = pointer.x;
    this.scrollAtPointerDown = this.scrollOffset;
    this.isDragging = false;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId || !pointer.isDown) return;

    const deltaX = pointer.x - this.pointerDownX;
    if (!this.isDragging && Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      this.isDragging = true;
      this.suppressTap = true;
    }

    if (!this.isDragging) return;

    this.scrollOffset = Phaser.Math.Clamp(
      this.scrollAtPointerDown - deltaX,
      0,
      this.maxScroll,
    );
    this.applyScrollOffset();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    if (this.isDragging) {
      this.suppressTap = true;
    }
    this.isDragging = false;
    this.activePointerId = null;
  }

  private applyScrollOffset(): void {
    this.container.setX(-this.scrollOffset);
  }
}
