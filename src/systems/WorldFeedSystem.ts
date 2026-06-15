// src/systems/WorldFeedSystem.ts
// Deterministic daily world activity feed (Section 37).

import { ARENA, RIFT_SEASON } from '../constants/gameConfig';
import { COVENANT_BOSSES } from '../data/covenantBosses';
import {
  NPC_FEED_COVENANT_NAMES,
  NPC_FEED_PLAYER_NAMES,
} from '../data/npcNames';
import { STAGES } from '../data/stages';
import type { RealmSaveDataV3 } from '../types';
import { ResetService } from './ResetService';

const FEED_MESSAGE_COUNT = 10;

type FeedActivityKind =
  | 'stage_clear'
  | 'arena_rank'
  | 'void_trial'
  | 'rift_season_tier'
  | 'covenant_boss'
  | 'featured_pull';

const FEED_ACTIVITY_KINDS: FeedActivityKind[] = [
  'stage_clear',
  'arena_rank',
  'void_trial',
  'rift_season_tier',
  'covenant_boss',
  'featured_pull',
];

function createSeededRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pickOne<T>(rng: () => number, items: readonly T[]): T {
  const index = Math.floor(rng() * items.length);
  return items[Math.min(index, items.length - 1)];
}

function stageShortLabel(stageName: string): string {
  const match = stageName.match(/^(Stage \d+-\d+)/);
  return match ? match[1] : stageName;
}

function formatStageClearMessage(rng: () => number): string {
  const name = pickOne(rng, NPC_FEED_PLAYER_NAMES);
  const stage = pickOne(rng, STAGES);
  return `${name} cleared ${stageShortLabel(stage.name)}`;
}

function formatArenaRankMessage(rng: () => number): string {
  const name = pickOne(rng, NPC_FEED_PLAYER_NAMES);
  const tier = pickOne(rng, ARENA.RANK_TIERS);
  return `${name} reached ${tier.name}`;
}

function formatVoidTrialMessage(rng: () => number): string {
  const name = pickOne(rng, NPC_FEED_PLAYER_NAMES);
  const floor = 1 + Math.floor(rng() * 20);
  return `${name} completed Void Trial floor ${floor}`;
}

function formatRiftSeasonTierMessage(rng: () => number): string {
  const name = pickOne(rng, NPC_FEED_PLAYER_NAMES);
  const tier = 1 + Math.floor(rng() * RIFT_SEASON.TOTAL_TIERS);
  return `${name} reached Rift Season tier ${tier}`;
}

function formatCovenantBossMessage(rng: () => number): string {
  const covenant = pickOne(rng, NPC_FEED_COVENANT_NAMES);
  const boss = pickOne(rng, COVENANT_BOSSES);
  return `Covenant ${covenant} defeated the ${boss.name}`;
}

function formatFeaturedPullMessage(rng: () => number): string {
  const name = pickOne(rng, NPC_FEED_PLAYER_NAMES);
  return `${name} drew a Legendary hero from the Featured Banner`;
}

function formatMessage(kind: FeedActivityKind, rng: () => number): string {
  switch (kind) {
    case 'stage_clear':
      return formatStageClearMessage(rng);
    case 'arena_rank':
      return formatArenaRankMessage(rng);
    case 'void_trial':
      return formatVoidTrialMessage(rng);
    case 'rift_season_tier':
      return formatRiftSeasonTierMessage(rng);
    case 'covenant_boss':
      return formatCovenantBossMessage(rng);
    case 'featured_pull':
      return formatFeaturedPullMessage(rng);
  }
}

export class WorldFeedSystem {
  static getDateKey(now = new Date()): string {
    return ResetService.getLocalDateKey(now);
  }

  /** Deterministic feed for a calendar date — same dateKey always yields the same sequence. */
  static generateFeed(dateKey: string, count = FEED_MESSAGE_COUNT): string[] {
    const rng = createSeededRng(`worldfeed|${dateKey}`);
    const messages: string[] = [];

    for (let i = 0; i < count; i += 1) {
      const kind = pickOne(rng, FEED_ACTIVITY_KINDS);
      messages.push(formatMessage(kind, rng));
    }

    return messages;
  }

  static getTodayFeed(now = new Date()): string[] {
    return WorldFeedSystem.generateFeed(WorldFeedSystem.getDateKey(now));
  }

  static syncFeedState(save: RealmSaveDataV3, now = new Date()): void {
    const dateKey = WorldFeedSystem.getDateKey(now);
    if (save.worldFeedState.dateKey !== dateKey) {
      save.worldFeedState = {
        dateKey,
        messageSeed: WorldFeedSystem.hashDateKey(dateKey),
        displayedIndex: 0,
      };
    }
  }

  private static hashDateKey(dateKey: string): number {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i += 1) {
      hash = (Math.imul(31, hash) + dateKey.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 100_000;
  }
}
