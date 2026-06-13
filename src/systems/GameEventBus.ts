// src/systems/GameEventBus.ts
// Shared progression event bus for achievements, season XP, and weekly tasks (Section 23.3).

import type { GameEvent, RealmSaveDataV3 } from '../types';

export type GameEventHandler = (save: RealmSaveDataV3, event: GameEvent) => void;

const handlers = new Map<GameEvent['type'], GameEventHandler[]>();
let defaultHandlersRegistered = false;

function registerNoOpHandlers(): void {
  if (defaultHandlersRegistered) return;
  defaultHandlersRegistered = true;

  const noop: GameEventHandler = () => {};

  const eventTypes: GameEvent['type'][] = [
    'stage_cleared',
    'arena_won',
    'hero_summoned',
    'hero_star_up',
    'hero_awakened',
    'sigil_upgraded',
    'sigil_dissolved',
    'covenant_joined',
    'covenant_contributed',
    'friend_gift_sent',
    'rift_season_tier_claimed',
  ];

  for (const type of eventTypes) {
    GameEventBus.register(type, noop);
  }
}

export class GameEventBus {
  static register(type: GameEvent['type'], handler: GameEventHandler): void {
    const existing = handlers.get(type) ?? [];
    handlers.set(type, [...existing, handler]);
  }

  static emit(save: RealmSaveDataV3, event: GameEvent): void {
    GameEventBus.process(save, [event]);
  }

  static process(save: RealmSaveDataV3, events: GameEvent[]): void {
    registerNoOpHandlers();

    for (const event of events) {
      const eventHandlers = handlers.get(event.type) ?? [];
      for (const handler of eventHandlers) {
        try {
          handler(save, event);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[GameEventBus] handler failed', { type: event.type, error });
          }
        }
      }

      if (import.meta.env.DEV) {
        console.info('[GameEventBus] process', event);
      }
    }
  }

  /** @internal Test helper — clears custom handlers while keeping no-op defaults. */
  static clearHandlers(): void {
    handlers.clear();
    defaultHandlersRegistered = false;
    registerNoOpHandlers();
  }
}

registerNoOpHandlers();
