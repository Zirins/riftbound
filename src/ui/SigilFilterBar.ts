// src/ui/SigilFilterBar.ts
// Rarity / element / stat filters for SigilScene.

import Phaser from 'phaser';
import type { ElementType, EquipmentSigilRarity, SigilStatType } from '../types';

export type SigilRarityFilter = 'all' | EquipmentSigilRarity;
export type SigilElementFilter = 'all' | ElementType;
export type SigilStatFilter = 'all' | 'hp' | 'attack' | 'defense';

export interface SigilFilterState {
  rarity: SigilRarityFilter;
  element: SigilElementFilter;
  stat: SigilStatFilter;
}

const RARITY_CYCLE: SigilRarityFilter[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
const ELEMENT_CYCLE: SigilElementFilter[] = ['all', 'iron', 'flame', 'storm', 'frost', 'void', 'light'];
const STAT_CYCLE: SigilStatFilter[] = ['all', 'hp', 'attack', 'defense'];

const FILTER_WIDTH = 250;
const FILTER_HEIGHT = 24;
const FILTER_GAP = 8;

function cycleValue<T>(values: T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length];
}

function formatRarity(value: SigilRarityFilter): string {
  return value === 'all' ? 'All Rarities' : value.charAt(0).toUpperCase() + value.slice(1);
}

function formatElement(value: SigilElementFilter): string {
  return value === 'all' ? 'All Elements' : value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStat(value: SigilStatFilter): string {
  if (value === 'all') return 'All Stats';
  if (value === 'hp') return 'HP Primary';
  if (value === 'attack') return 'ATK Primary';
  return 'DEF Primary';
}

interface FilterChipUi {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export class SigilFilterBar {
  private readonly chips: FilterChipUi[] = [];
  private state: SigilFilterState = { rarity: 'all', element: 'all', stat: 'all' };

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    private readonly onChange: (state: SigilFilterState) => void,
  ) {
    const configs: {
      key: keyof SigilFilterState;
      prefix: string;
      getLabel: () => string;
      cycle: () => void;
    }[] = [
      {
        key: 'rarity',
        prefix: 'Rarity',
        getLabel: () => formatRarity(this.state.rarity),
        cycle: () => { this.state.rarity = cycleValue(RARITY_CYCLE, this.state.rarity); },
      },
      {
        key: 'element',
        prefix: 'Element',
        getLabel: () => formatElement(this.state.element),
        cycle: () => { this.state.element = cycleValue(ELEMENT_CYCLE, this.state.element); },
      },
      {
        key: 'stat',
        prefix: 'Stat',
        getLabel: () => formatStat(this.state.stat),
        cycle: () => { this.state.stat = cycleValue(STAT_CYCLE, this.state.stat); },
      },
    ];

    configs.forEach((config, index) => {
      const x = startX + FILTER_WIDTH / 2;
      const y = startY + index * (FILTER_HEIGHT + FILTER_GAP);
      const bg = scene.add.rectangle(x, y, FILTER_WIDTH, FILTER_HEIGHT, 0x222233)
        .setStrokeStyle(1, 0x444466);
      const label = scene.add.text(x, y, '', {
        fontSize: '10px',
        color: '#ccccdd',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const zone = scene.add.zone(x, y, FILTER_WIDTH, FILTER_HEIGHT);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        config.cycle();
        this.refreshLabels(configs);
        this.onChange({ ...this.state });
      });

      this.chips.push({ bg, label, zone });
    });

    this.refreshLabels(configs);
  }

  getState(): SigilFilterState {
    return { ...this.state };
  }

  destroy(): void {
    for (const chip of this.chips) {
      chip.zone.removeAllListeners();
      chip.zone.destroy();
      chip.bg.destroy();
      chip.label.destroy();
    }
    this.chips.length = 0;
  }

  private refreshLabels(
    configs: { prefix: string; getLabel: () => string }[],
  ): void {
    configs.forEach((config, index) => {
      this.chips[index]?.label.setText(`${config.prefix}: ${config.getLabel()}`);
    });
  }
}

export function matchesSigilFilters(
  entry: {
    rarity: EquipmentSigilRarity;
    element: ElementType;
    primaryStat: SigilStatType;
  },
  filters: SigilFilterState,
): boolean {
  if (filters.rarity !== 'all' && entry.rarity !== filters.rarity) return false;
  if (filters.element !== 'all' && entry.element !== filters.element) return false;
  if (filters.stat !== 'all' && entry.primaryStat !== filters.stat) return false;
  return true;
}
