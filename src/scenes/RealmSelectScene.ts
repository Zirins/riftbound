// src/scenes/RealmSelectScene.ts
// First-time realm selection and Relic Bearer naming.

import Phaser from 'phaser';
import { APP, CANVAS, UI } from '../constants/gameConfig';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { initNewSave } from '../systems/RealmSystem';
import { ButtonPrimary } from '../ui/ButtonPrimary';

interface RealmOption {
  id: string;
  name: string;
  populationLabel: string;
  recommended?: boolean;
}

const REALM_OPTIONS: RealmOption[] = [
  { id: 'argent_dawn', name: 'Argent Dawn', populationLabel: 'BUSY' },
  { id: 'hollow_veil', name: 'Hollow Veil', populationLabel: 'ACTIVE' },
  { id: 'ironreach', name: 'Ironreach', populationLabel: 'NORMAL', recommended: true },
  { id: 'ashsteppe', name: 'Ashsteppe', populationLabel: 'QUIET' },
];

const CARD_WIDTH = 160;
const CARD_HEIGHT = 120;
const CARD_GAP = 20;
const CARD_START_X = 72;
const CARD_Y = 130;
const MAX_NAME_LENGTH = 12;

export class RealmSelectScene extends Phaser.Scene {
  static readonly KEY = SCENE_KEYS.REALM_SELECT;

  private selectedRealmId: string | null = null;
  private realmCards: Phaser.GameObjects.Rectangle[] = [];
  private realmLabels: Phaser.GameObjects.Text[] = [];
  private enterButton!: ButtonPrimary;
  private recommendedLabel!: Phaser.GameObjects.Text;
  private overlayContainer: Phaser.GameObjects.Container | null = null;
  private nameInput: HTMLInputElement | null = null;
  private nameConfirmButton: ButtonPrimary | null = null;
  private onNameInputHandler: (() => void) | null = null;

  constructor() {
    super({ key: RealmSelectScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);

    this.add.text(CANVAS.WIDTH / 2, 36, APP.NAME, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(CANVAS.WIDTH / 2, 72, 'Choose Your Realm', {
      fontSize: '18px',
      color: '#44ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    REALM_OPTIONS.forEach((realm, index) => {
      const x = CARD_START_X + index * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
      const card = this.add.rectangle(x, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 0x2a2a44);
      card.setStrokeStyle(2, 0x555577);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.selectRealm(realm.id), this);

      const nameLabel = this.add.text(x, CARD_Y - 28, realm.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const popLabel = this.add.text(x, CARD_Y + 10, this.getPopulationBar(index), {
        fontSize: '11px',
        color: '#aaaacc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const statusLabel = this.add.text(x, CARD_Y + 32, realm.populationLabel, {
        fontSize: '12px',
        color: '#ffcc44',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.realmCards.push(card);
      this.realmLabels.push(nameLabel, popLabel, statusLabel);
    });

    this.recommendedLabel = this.add.text(
      CANVAS.WIDTH / 2,
      220,
      'Recommended: Ironreach',
      {
        fontSize: '13px',
        color: '#88cc88',
        fontFamily: 'monospace',
      },
    ).setOrigin(0.5);

    this.enterButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH - 140,
      CANVAS.HEIGHT - 48,
      'ENTER REALM →',
      () => this.openNameEntryOverlay(),
      200,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    this.enterButton.setEnabled(false);
  }

  shutdown(): void {
    this.closeNameEntryOverlay();
    this.enterButton?.destroy();

    for (const card of this.realmCards) {
      card.off('pointerup');
      card.destroy();
    }
    this.realmCards.length = 0;

    for (const label of this.realmLabels) {
      label.destroy();
    }
    this.realmLabels.length = 0;

    this.recommendedLabel?.destroy();
  }

  private selectRealm(realmId: string): void {
    this.selectedRealmId = realmId;

    REALM_OPTIONS.forEach((realm, index) => {
      const selected = realm.id === realmId;
      this.realmCards[index].setStrokeStyle(2, selected ? 0x44ccff : 0x555577);
      this.realmCards[index].setFillStyle(selected ? 0x334466 : 0x2a2a44);
    });

    this.enterButton.setEnabled(true);
    const option = REALM_OPTIONS.find((r) => r.id === realmId);
    this.recommendedLabel.setText(
      option?.recommended ? `Recommended: ${option.name}` : `Selected: ${option?.name ?? realmId}`,
    );
  }

  private openNameEntryOverlay(): void {
    if (!this.selectedRealmId || this.overlayContainer) return;

    const overlay = this.add.container(0, 0);
    const dim = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.HEIGHT,
      0x000000,
      0.7,
    );
    dim.setInteractive();

    const panel = this.add.rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, 420, 180, 0x1a1a2e);
    panel.setStrokeStyle(2, 0x44ccff);

    const title = this.add.text(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 50, 'Name your Relic Bearer', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const confirmButton = new ButtonPrimary(
      this,
      CANVAS.WIDTH / 2 + 90,
      CANVAS.HEIGHT / 2 + 40,
      'CONFIRM',
      () => this.confirmNameEntry(),
      120,
      UI.SCENE_NAV_BUTTON_HEIGHT,
    );
    confirmButton.setEnabled(false);

    overlay.add([dim, panel, title]);

    this.overlayContainer = overlay;
    this.nameConfirmButton = confirmButton;
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = MAX_NAME_LENGTH;
    this.nameInput.placeholder = 'Relic Bearer name';
    this.nameInput.style.position = 'absolute';
    this.nameInput.style.left = '50%';
    this.nameInput.style.top = '50%';
    this.nameInput.style.transform = 'translate(-50%, -20px)';
    this.nameInput.style.width = '280px';
    this.nameInput.style.padding = '8px';
    this.nameInput.style.fontSize = '16px';
    this.nameInput.style.fontFamily = 'monospace';
    this.nameInput.style.textAlign = 'center';
    this.nameInput.style.zIndex = '1000';

    const parent = document.getElementById('game-container') ?? document.body;
    parent.appendChild(this.nameInput);
    this.nameInput.focus();

    const onInput = (): void => {
      const valid = (this.nameInput?.value.trim().length ?? 0) >= 2;
      this.nameConfirmButton?.setEnabled(valid);
    };

    this.onNameInputHandler = onInput;
    this.nameInput.addEventListener('input', onInput);
    onInput();
  }

  private confirmNameEntry(): void {
    if (!this.selectedRealmId || !this.nameInput) return;

    const playerName = this.nameInput.value.trim();
    if (playerName.length < 2) return;

    initNewSave(this.selectedRealmId, playerName);
    this.closeNameEntryOverlay();
    this.scene.start(SCENE_KEYS.HUB);
  }

  private closeNameEntryOverlay(): void {
    if (this.nameInput) {
      if (this.onNameInputHandler) {
        this.nameInput.removeEventListener('input', this.onNameInputHandler);
      }
      this.nameInput.remove();
      this.nameInput = null;
    }

    this.nameConfirmButton?.destroy();
    this.nameConfirmButton = null;
    this.onNameInputHandler = null;

    this.overlayContainer?.destroy(true);
    this.overlayContainer = null;
  }

  private getPopulationBar(realmIndex: number): string {
    const fill = ['████', '███░', '██░░', '█░░░'][realmIndex] ?? '██░░';
    return `${fill}`;
  }
}
