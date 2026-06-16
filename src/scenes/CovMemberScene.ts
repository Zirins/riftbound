// src/scenes/CovMemberScene.ts
// Covenant member roster with role, power, activity, and weekly contribution.

import Phaser from 'phaser';
import { CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { CovSystem } from '../systems/CovSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import type { CovenantMember, RealmSaveDataV3 } from '../types';
import { ButtonPrimary } from '../ui/ButtonPrimary';

const ROW_HEIGHT = 36;
const LIST_TOP_Y = 96;
const VISIBLE_ROWS = 8;
const LIST_VIEW_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT;
const LIST_WIDTH = 520;

function formatRole(role: CovenantMember['role']): string {
  switch (role) {
    case 'leader':
      return 'Leader';
    case 'member':
      return 'Member';
    default:
      return 'NPC';
  }
}

export class CovMemberScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.COVENANT_MEMBER;

  private backButton: ButtonPrimary | null = null;
  private listTexts: Phaser.GameObjects.Text[] = [];
  private listContainer: Phaser.GameObjects.Container | null = null;
  private listMaskRect: Phaser.GameObjects.Rectangle | null = null;
  private scrollOffsetY = 0;
  private maxScrollY = 0;

  constructor() {
    super({ key: CovMemberScene.KEY });
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

    const state = CovSystem.getState(save);

    this.backButton = new ButtonPrimary(
      this,
      72,
      32,
      '← SECT HUB',
      () => this.scene.start(SCENE_KEYS.COVENANT_HUB),
      120,
    );

    this.add.text(CANVAS.WIDTH / 2, 32, 'MEMBER LIST', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, 58, `${state.covName}  ·  ${state.memberCount} members`, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.renderHeaderRow();
    this.renderMembers(CovSystem.sortMembers(state.members));
  }

  private renderHeaderRow(): void {
    const y = LIST_TOP_Y;
    const columns = [
      { label: 'NAME', x: 80 },
      { label: 'ROLE', x: 240 },
      { label: 'RP', x: 340 },
      { label: 'ACTIVE', x: 430 },
      { label: 'WEEKLY', x: 540 },
    ];

    for (const column of columns) {
      const text = this.add.text(column.x, y, column.label, {
        fontSize: '10px',
        color: '#888899',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.listTexts.push(text);
    }
  }

  private renderMembers(members: CovenantMember[]): void {
    this.listContainer?.destroy(true);
    this.listContainer = null;
    this.listMaskRect?.destroy(true);
    this.listMaskRect = null;
    this.scrollOffsetY = 0;
    this.maxScrollY = 0;

    const listTopContentY = LIST_TOP_Y + 22;
    const listContainer = this.add.container(0, 0);
    this.listContainer = listContainer;

    members.forEach((member, index) => {
      const y = listTopContentY + index * ROW_HEIGHT;
      const isPlayer = member.role === 'leader' || member.role === 'member';
      const nameColor = isPlayer ? '#44ccff' : '#ffffff';

      const cells = [
        { text: member.name, x: 80, color: nameColor },
        { text: formatRole(member.role), x: 240, color: '#cccccc' },
        { text: member.resonancePower.toLocaleString(), x: 340, color: '#cccccc' },
        { text: member.lastActiveText, x: 430, color: '#aaaaaa' },
        { text: String(member.weeklyContribution), x: 540, color: '#cccccc' },
      ];

      for (const cell of cells) {
        const label = this.add.text(cell.x, y, cell.text, {
          fontSize: '10px',
          color: cell.color,
          fontFamily: 'monospace',
        }).setOrigin(0, 0.5);
        this.listTexts.push(label);
        listContainer.add(label);
      }
    });

    // Mask the list to a fixed 8-row viewport (scroll activates beyond that).
    this.listMaskRect = this.add.rectangle(
      CANVAS.WIDTH / 2,
      listTopContentY + LIST_VIEW_HEIGHT / 2 - ROW_HEIGHT / 2,
      LIST_WIDTH,
      LIST_VIEW_HEIGHT,
      0x000000,
      0,
    );
    const mask = this.listMaskRect.createGeometryMask();
    listContainer.setMask(mask);

    const totalHeight = Math.max(0, members.length * ROW_HEIGHT);
    this.maxScrollY = Math.max(0, totalHeight - LIST_VIEW_HEIGHT);

    if (this.maxScrollY > 0) {
      this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
        this.scrollOffsetY = Phaser.Math.Clamp(this.scrollOffsetY + dy * 0.6, 0, this.maxScrollY);
        listContainer.setY(-this.scrollOffsetY);
      });
    }
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.backButton = null;

    this.input.off('wheel');
    this.listContainer?.destroy(true);
    this.listContainer = null;
    this.listMaskRect?.destroy(true);
    this.listMaskRect = null;

    for (const text of this.listTexts) text.destroy();
    this.listTexts.length = 0;
  }
}
