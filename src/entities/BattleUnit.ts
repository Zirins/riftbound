// src/entities/BattleUnit.ts
// Base combat unit data — position, HP, energy, alive state, radius.

export interface BattleUnitInit {
  x: number;
  y: number;
  currentHP: number;
  maxHP: number;
  currentEnergy: number;
  isAlive: boolean;
  radius: number;
}

export class BattleUnit {
  x: number;
  y: number;
  currentHP: number;
  maxHP: number;
  currentEnergy: number;
  isAlive: boolean;
  radius: number;

  constructor(init: BattleUnitInit) {
    this.x = init.x;
    this.y = init.y;
    this.currentHP = init.currentHP;
    this.maxHP = init.maxHP;
    this.currentEnergy = init.currentEnergy;
    this.isAlive = init.isAlive;
    this.radius = init.radius;
  }
}
