// src/ui/HubHUD.ts
// Fixed hub HUD — currency pills, icon buttons (does not scroll).

import Phaser from 'phaser';
import { CANVAS, ENERGY } from '../constants/gameConfig';
import { AchievementSystem } from '../systems/AchievementSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { FriendSystem } from '../systems/FriendSystem';
import {
  getUnlockMessage,
  isUnlocked,
  type FeatureKey,
} from '../systems/FeatureUnlockSystem';
import * as MailSystem from '../systems/MailSystem';
import { loadCurrentRealm } from '../systems/SaveSystem';
import * as TaskSystem from '../systems/TaskSystem';
import type { RealmSaveDataV3 } from '../types';

const HUD_DEPTH = 10;
const PILL_HEIGHT = 24;
const CURRENCY_TOP = 8;
const CURRENCY_RIGHT_MARGIN = 8;
const CURRENCY_Y = CURRENCY_TOP + PILL_HEIGHT / 2;
const ICON_BTN_SIZE = 36;
const PILL_PADDING_X = 8;
const PILL_GAP = 8;
const PILL_RADIUS = 10;
const PILL_FILL_ALPHA = 0.55;
const HUD_TEXT_STYLE = {
  fontSize: '11px',
  color: '#ffffff',
  fontFamily: 'monospace',
} as const;

export interface HubHUDCallbacks {
  onMail: () => void;
  onFriends: () => void;
  onAchievements: () => void;
  onHeroes: () => void;
  onBag: () => void;
  onTasks: () => void;
  onSettings: () => void;
  onPass: () => void;
  onQuickBattle: () => void;
  showToast: (message: string) => void;
}

interface HudNotificationDot {
  circle: Phaser.GameObjects.Arc;
  countLabel: Phaser.GameObjects.Text;
}

interface IconButton {
  zone: Phaser.GameObjects.Zone;
  label: Phaser.GameObjects.Text;
  dot: HudNotificationDot | null;
  featureKey?: FeatureKey;
  onClick?: () => void;
}

interface CurrencyPillEntry {
  background: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Arc | null;
  label: Phaser.GameObjects.Text;
}

export class HubHUD {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: HubHUDCallbacks;
  private readonly fixedObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly iconButtons: IconButton[] = [];
  private readonly currencyPills: CurrencyPillEntry[] = [];

  constructor(scene: Phaser.Scene, callbacks: HubHUDCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    this.currencyPills.push(this.createCurrencyPill(
      scene.add.circle(0, 0, 5, 0xffcc00),
      scene.add.text(0, 0, '', {
        ...HUD_TEXT_STYLE,
        fontSize: '12px',
      }).setOrigin(0, 0.5),
    ));
    this.currencyPills.push(this.createCurrencyPill(
      scene.add.circle(0, 0, 5, 0x44aaff),
      scene.add.text(0, 0, '', {
        ...HUD_TEXT_STYLE,
        fontSize: '12px',
      }).setOrigin(0, 0.5),
    ));
    this.currencyPills.push(this.createCurrencyPill(
      scene.add.circle(0, 0, 5, 0xaa66ff),
      scene.add.text(0, 0, '', {
        ...HUD_TEXT_STYLE,
        fontSize: '12px',
      }).setOrigin(0, 0.5),
    ));
    this.currencyPills.push(this.createCurrencyPill(
      null,
      scene.add.text(0, 0, '', {
        ...HUD_TEXT_STYLE,
        fontSize: '12px',
      }).setOrigin(0, 0.5),
    ));

    this.addTextButton(36, CANVAS.HEIGHT - 34, 'MAIL', callbacks.onMail);
    this.addTextButton(82, CANVAS.HEIGHT - 34, 'FRIENDS', () => this.navigateFeature('FRIENDS', callbacks.onFriends));
    this.addTextButton(128, CANVAS.HEIGHT - 34, 'ACHIEV', () => this.navigateFeature('ACHIEVEMENTS', callbacks.onAchievements));

    this.addLabeledButton(CANVAS.WIDTH - 150, CANVAS.HEIGHT - 34, 'HEROES', () => {
      this.navigateFeature('HEROES_ROSTER', callbacks.onHeroes);
    });
    this.addLabeledButton(CANVAS.WIDTH - 62, CANVAS.HEIGHT - 34, 'BAG', () => {
      this.navigateFeature('INVENTORY', callbacks.onBag);
    });

    this.addIconButton(CANVAS.WIDTH - 200, 58, '☑', callbacks.onTasks);
    this.addIconButton(CANVAS.WIDTH - 158, 58, '⚙', callbacks.onSettings);
    this.addIconButton(CANVAS.WIDTH - 116, 58, '🎫', () => this.navigateFeature('RIFT_SEASON', callbacks.onPass));
    this.addIconButton(CANVAS.WIDTH - 74, 58, '▶▶', () => {
      this.navigateFeature('FORMATION', callbacks.onQuickBattle);
    });

    this.pinFixedDepth();
    this.refresh();
  }

  refresh(): void {
    this.refreshCurrency();
    this.refreshNotificationDots();
  }

  destroy(): void {
    for (const button of this.iconButtons) {
      button.zone.off('pointerup');
      button.zone.destroy();
      button.label.destroy();
      button.dot?.circle.destroy();
      button.dot?.countLabel.destroy();
    }
    this.iconButtons.length = 0;

    for (const object of this.fixedObjects) {
      object.destroy();
    }
    this.fixedObjects.length = 0;
    this.currencyPills.length = 0;
  }

  private createCurrencyPill(
    icon: Phaser.GameObjects.Arc | null,
    label: Phaser.GameObjects.Text,
  ): CurrencyPillEntry {
    const background = this.scene.add.graphics();
    if (icon) this.track(icon);
    this.track(background, label);
    return { background, icon, label };
  }

  private track(...objects: Phaser.GameObjects.GameObject[]): void {
    this.fixedObjects.push(...objects);
  }

  private pinFixedDepth(): void {
    for (const object of this.fixedObjects) {
      this.pinGameObject(object);
    }
    for (const button of this.iconButtons) {
      button.zone.setScrollFactor(0);
      button.label.setScrollFactor(0);
      button.zone.setDepth(HUD_DEPTH);
      button.label.setDepth(HUD_DEPTH);
      button.dot?.circle.setScrollFactor(0);
      button.dot?.countLabel.setScrollFactor(0);
      button.dot?.circle.setDepth(HUD_DEPTH + 1);
      button.dot?.countLabel.setDepth(HUD_DEPTH + 1);
    }
  }

  private pinGameObject(object: Phaser.GameObjects.GameObject): void {
    const scrollable = object as Phaser.GameObjects.GameObject & {
      setScrollFactor: (x: number, y?: number) => void;
      setDepth: (depth: number) => void;
    };
    scrollable.setScrollFactor(0);
    scrollable.setDepth(HUD_DEPTH);
  }

  private refreshCurrency(): void {
    const realm = loadCurrentRealm();
    const save = realm as RealmSaveDataV3 | null;
    const gold = save?.inventory.gold ?? 0;
    const crystals = save?.inventory.riftCrystals ?? 0;
    const voidGems = save ? EconomySystem.getCurrencyBalance(save, 'void_gem') : 0;
    const energy = save?.inventory.energy ?? 0;
    const maxEnergy = save?.inventory.maxEnergy ?? ENERGY.MAX;

    this.currencyPills[0].label.setText(String(gold));
    this.currencyPills[1].label.setText(String(crystals));
    this.currencyPills[2].label.setText(String(voidGems));
    this.currencyPills[3].label.setText(`⚡ ${energy}/${maxEnergy}`);

    this.layoutCurrencyPills();
  }

  private layoutCurrencyPills(): void {
    const pillWidths: number[] = [];

    for (const pill of this.currencyPills) {
      const iconWidth = pill.icon ? pill.icon.radius * 2 : 0;
      const iconGap = pill.icon ? 4 : 0;
      const contentWidth = iconWidth + iconGap + pill.label.width;
      pillWidths.push(contentWidth + PILL_PADDING_X * 2);
    }

    const totalWidth = pillWidths.reduce((sum, width) => sum + width, 0)
      + PILL_GAP * (pillWidths.length - 1);
    let x = CANVAS.WIDTH - CURRENCY_RIGHT_MARGIN - totalWidth;

    for (let i = 0; i < this.currencyPills.length; i++) {
      const pill = this.currencyPills[i];
      const iconWidth = pill.icon ? pill.icon.radius * 2 : 0;
      const iconGap = pill.icon ? 4 : 0;
      const pillWidth = pillWidths[i];
      const pillTop = CURRENCY_TOP;

      pill.background.clear();
      pill.background.fillStyle(0x000000, PILL_FILL_ALPHA);
      pill.background.fillRoundedRect(x, pillTop, pillWidth, PILL_HEIGHT, PILL_RADIUS);

      const contentX = x + PILL_PADDING_X;
      if (pill.icon) {
        pill.icon.setPosition(contentX + pill.icon.radius, CURRENCY_Y);
        pill.label.setPosition(contentX + iconWidth + iconGap, CURRENCY_Y);
      } else {
        pill.label.setPosition(contentX, CURRENCY_Y);
      }

      x += pillWidth + PILL_GAP;
    }
  }

  private refreshNotificationDots(): void {
    const realm = loadCurrentRealm();
    const save = realm as RealmSaveDataV3 | null;

    const mailCount = MailSystem.getUnclaimedCount();
    this.setDotForButton('MAIL', mailCount > 0 ? mailCount : undefined);

    const taskCount = TaskSystem.getTasksNotificationCount();
    this.setDotForIcon('☑', taskCount > 0 ? taskCount : undefined);

    const friendCount = save ? FriendSystem.getPendingGiftCount(save) : 0;
    this.setDotForButton('FRIENDS', friendCount > 0 ? friendCount : undefined);

    const achievementCount = save ? AchievementSystem.getUnclaimedCount(save) : 0;
    this.setDotForButton('ACHIEV', achievementCount > 0 ? achievementCount : undefined);
  }

  private setDotForButton(text: string, count?: number): void {
    const button = this.iconButtons.find((entry) => entry.label.text === text);
    if (!button?.dot) return;
    const show = count !== undefined && count > 0;
    button.dot.circle.setVisible(show);
    button.dot.countLabel.setVisible(show);
    if (show) button.dot.countLabel.setText(String(count));
  }

  private setDotForIcon(icon: string, count?: number): void {
    const button = this.iconButtons.find((entry) => entry.label.text === icon);
    if (!button?.dot) return;
    const show = count !== undefined && count > 0;
    button.dot.circle.setVisible(show);
    button.dot.countLabel.setVisible(show);
    if (show) button.dot.countLabel.setText(String(count));
  }

  private createNotificationDot(x: number, y: number): HudNotificationDot {
    const circle = this.scene.add.circle(x, y, 8, 0xff2222).setVisible(false);
    const countLabel = this.scene.add.text(x, y, '', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);
    return { circle, countLabel };
  }

  private addTextButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
  ): void {
    const label = this.scene.add.text(x, y, text, {
      ...HUD_TEXT_STYLE,
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x, y, 56, ICON_BTN_SIZE);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    const dot = this.createNotificationDot(x + 24, y - 12);
    this.iconButtons.push({ zone, label, dot, onClick });
  }

  private addIconButton(
    x: number,
    y: number,
    icon: string,
    onClick: () => void,
    featureKey?: FeatureKey,
  ): void {
    const label = this.scene.add.text(x, y, icon, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x, y, ICON_BTN_SIZE, ICON_BTN_SIZE);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    const dot = this.createNotificationDot(x + 12, y - 12);
    this.iconButtons.push({ zone, label, dot, featureKey, onClick });
  }

  private addLabeledButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
  ): void {
    const label = this.scene.add.text(x, y, text, {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x, y, 72, ICON_BTN_SIZE);
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);

    this.iconButtons.push({ zone, label, dot: null, onClick });
  }

  private navigateFeature(
    featureKey: FeatureKey,
    onAllowed: () => void,
  ): void {
    if (!isUnlocked(featureKey)) {
      this.callbacks.showToast(getUnlockMessage(featureKey));
      return;
    }
    onAllowed();
  }
}
