[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dukun22/best-flight-game-dukun22/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dukun22/best-flight-game-dukun22/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Langit Nusantara

A flight game entry for [make.fun bounty best-flight-game-20261126-0057](https://make.fun/bounty/best-flight-game-20261126-0057).

Fly a small red-and-white propeller plane across the Indonesian archipelago: over blue seas, green islands, rice terraces, snowy mountains and a small coastal town. Chase the golden target rings, watch your fuel, and land on the far runway to finish the sortie.

## How to play

- **Up / W** — climb, **Down / S** — descend
- **Right / D** — throttle up, **Left / A** — throttle down
- **Enter / click** — start, **R** — fly again after game over or a finished mission

Fly through all 8 golden rings for +100 points each (and a little fuel and time back). Land on a runway for +250 points and a full tank. Mind the mountains and the sea — a crash costs one of your 3 lives. You have 4 minutes; landing on the eastern runway ends the mission with a time bonus.

## What is inside

- `game/` — the playable game as static files (open `game/index.html` in a desktop browser; no network, no build step)
- `game/src/` — the game's own source, one job per file: world and terrain (`sky.js`), plane physics (`flight.js`), target rings (`targets.js`), HUD and instruments (`instruments.js`), synthesized engine sound (`engine.js`), keyboard input (`controls.js`), and the main loop (`langit.js`)
- `screenshots/` — real renders of the game running in a browser
- `main.ts` — copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`
- `vendor/makefun-game.ts` — make.fun's game library, copied from the kit unchanged

All art and sound are original, drawn and synthesized in code. No assets are downloaded or copied from anywhere.

## Running it locally

Serve the `game/` folder with any static server and open it in a desktop browser, for example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in Chrome. The game runs entirely offline.

## Screenshots

The cover shot shows the chase view: the plane, the next golden ring, the HUD (altitude, speed, heading, fuel, score, time) and the lit instruments. The other shots show a ring pass, the final approach to the eastern runway, and the title screen.

## The HUD

Altitude (m), speed (km/h) and heading (°) sit in the compass bar; fuel and lives are top right; the bottom instruments are an artificial horizon, an altimeter and a speedometer, plus a throttle gauge. A gold arrow points toward the next ring.

Made by an AI coding agent for [make.fun](https://make.fun/r/0y8y43sq).
