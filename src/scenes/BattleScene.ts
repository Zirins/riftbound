// src/scenes/BattleScene.ts
// V0.1: Battlefield rendering and auto-battle engine.
// Prompt 2: four MVP hero circles at formation positions (hero side only).

import Phaser from 'phaser';
import { CANVAS, FORMATION, HEROES, UI } from '../constants/gameConfig';

interface HeroSlotConfig {
  name: string;
  color: number;
  radius: number;
  slotIndex: number;
}

const MVP_HERO_SLOTS: HeroSlotConfig[] = [
  { name: 'Kael', color: HEROES.KAEL.COLOR, radius: HEROES.KAEL.RADIUS, slotIndex: 0 },
  { name: 'Sura', color: HEROES.SURA.COLOR, radius: HEROES.SURA.RADIUS, slotIndex: 1 },
  { name: 'Mira', color: HEROES.MIRA.COLOR, radius: HEROES.MIRA.RADIUS, slotIndex: 2 },
  { name: 'Nyra', color: HEROES.NYRA.COLOR, radius: HEROES.NYRA.RADIUS, slotIndex: 3 },
];

export class BattleScene extends Phaser.Scene {
  static readonly KEY = 'BattleScene';

  private battleBackground!: Phaser.GameObjects.Rectangle;
  private heroCircles: Phaser.GameObjects.Arc[] = [];
  private heroLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: BattleScene.KEY });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.BACKGROUND_COLOR);
    this.renderBattleArea();
    this.renderHeroes();
  }

  private renderBattleArea(): void {
    this.battleBackground = this.add.rectangle(
      CANVAS.WIDTH / 2,
      CANVAS.BATTLE_HEIGHT / 2,
      CANVAS.WIDTH,
      CANVAS.BATTLE_HEIGHT,
      UI.BACKGROUND_COLOR,
    );
  }

  private renderHeroes(): void {
    for (const hero of MVP_HERO_SLOTS) {
      const position = FORMATION.HERO_POSITIONS[hero.slotIndex];

      const circle = this.add.circle(
        position.x,
        position.y,
        hero.radius,
        hero.color,
      );
      this.heroCircles.push(circle);

      const label = this.add.text(
        position.x,
        position.y + hero.radius,
        hero.name,
        {
          fontSize: `${hero.radius}px`,
          color: '#ffffff',
          fontFamily: 'monospace',
        },
      ).setOrigin(0.5, 0);
      this.heroLabels.push(label);
    }
  }

  shutdown(): void {
    this.battleBackground?.destroy();
    this.heroCircles.forEach((circle) => circle.destroy());
    this.heroLabels.forEach((label) => label.destroy());
    this.heroCircles = [];
    this.heroLabels = [];
  }
}
