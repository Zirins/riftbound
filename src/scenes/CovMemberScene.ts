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
const LIST_HEIGHT = 250;

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
      '← COVENANT',
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
    const maxRows = Math.floor(LIST_HEIGHT / ROW_HEIGHT);
    const visible = members.slice(0, maxRows);

    visible.forEach((member, index) => {
      const y = LIST_TOP_Y + 22 + index * ROW_HEIGHT;
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
      }
    });

    if (members.length > maxRows) {
      const overflow = this.add.text(
        CANVAS.WIDTH / 2,
        LIST_TOP_Y + LIST_HEIGHT + 8,
        `+ ${members.length - maxRows} more members`,
        {
          fontSize: '10px',
          color: '#888899',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5);
      this.listTexts.push(overflow);
    }
  }

  shutdown(): void {
    this.backButton?.destroy();
    this.backButton = null;

    for (const text of this.listTexts) text.destroy();
    this.listTexts.length = 0;
  }
}
