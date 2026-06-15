# Riftbound Sigils

**Original xianxia-inspired cultivation fantasy hero-collector auto-battler RPG** — built as solo/personal project IP, not affiliated with any other game.

## What it is

Riftbound Sigils is a landscape mobile RPG where you command a squad of Relic Bearers, bond Sigils, clear campaign stages, and progress through daily retention systems (Arena, Covenant, Void Trial, Rift Season battle pass, and more). Combat is side-view formation auto-battle with readable ultimates and collection-driven growth.

## Status

**V2 complete** — all 32 implementation phases shipped and verified in code/harnesses.  
**Pending:** final manual Android device pass (fresh install, back button, background/foreground).

## Tech stack

- **Phaser 3** — game rendering and scenes
- **TypeScript** — systems and data
- **Vite** — dev server and production bundle
- **Capacitor 6** — Android shell
- **localStorage** — local save persistence (schema v3)

## Quick start

```bash
npm install
npm run dev          # browser dev server (http://localhost:3000)
npm run build        # typecheck + production bundle → dist/
npm run cap:sync     # build + copy to Android project
npm run cap:android  # open Android Studio
```

Typecheck only: `npm run typecheck`

Harness self-tests (node): `npx vite-node src/dev/runHarnessSelfTests.ts`

## Features (V2)

- **Campaign** — Chapters 1–3 with specced enemies, sweep on 3-star clears
- **Heroes** — collection, kits (passive/ultimate/side skills), awakening, Sigils, Bonds
- **Arena** — Resonance Arena ranks and seasonal progression
- **Covenant** — simulated guild: contribution, tech, weekly shop, boss
- **Void Trial** — repeatable weekly tower with daily/weekly resets
- **Rift Season** — 30-day battle pass (free + premium tracks)
- **Featured Banner** — 50/50 + pity summon system
- **Patron Tier** — cosmetics/QoL perks only
- **Retention** — daily/weekly tasks, achievements, mail, offline rewards, World Feed ticker, Claim All QoL
- **Monetization** — test/dev purchase UI only; production billing disabled
- **Art** — optional PNG assets with programmatic fallbacks (no crash if missing)

## Project structure

- `src/scenes/` — Phaser scenes (Hub, Battle, Roster, etc.)
- `src/systems/` — game logic (RewardSystem, EconomySystem, SaveSystem, …)
- `src/data/` — static configuration (heroes, stages, tasks, …)
- `public/assets/` — optional art (portraits, backgrounds, icons)
- `docs/` — design briefs and vision (not required to run the game)

## License

Private personal project — all rights reserved unless otherwise noted.
