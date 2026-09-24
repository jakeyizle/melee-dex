# melee-dex

Electron desktop app (React + Vite + TypeScript) that indexes a local Slippi `.slp` replay
directory and, when a game starts, shows live head-to-head and personal stats against the current
opponent. Windows-targeted — only an NSIS x64 installer is built.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts Vite and auto-launches Electron. |
| `npm run build` | `tsc` typecheck → `vite build` → `electron-builder` into `release/<version>/`. |
| `npm test` | The unit suite (`test/unit/`). Fast — no build step. |
| `npm run test:watch` | Same suite in watch mode. |
| `npm run test:e2e` | The Playwright-Electron specs. `pretest:e2e` builds the app first. |

`npx tsc --noEmit` typechecks without packaging.

**There is no lint or format script.** `eslint`, `prettier`, `tailwindcss`, `postcss` and
`autoprefixer` are installed but have no config files and are used nowhere — do not reach for
Tailwind or add tooling configs unless asked. Formatting comes from VS Code format-on-save:
Prettier defaults, double quotes, semicolons, 2-space indent, trailing commas.

## Tests

- `test/unit/` — parsing, stat aggregation, the db layer, the store and the components, run by
  `vitest.unit.config.ts`. `test/helpers/` holds an in-memory `KeyValueStore` fake, a `Replay`
  builder, a fake `ipcRenderer` and `renderComponent`, so no IndexedDB, browser or Electron is
  needed. `replayParsing.test.ts` parses the real `.slp` files in `testdata/` and is most of the
  runtime.

  The config runs in **Node by default**; a `.test.tsx` file opts into a DOM with
  `// @vitest-environment jsdom` on its first line. Component tests render through
  `renderComponent` (which supplies the router — every page either navigates or renders a `Link`)
  and drive state with `useReplayStore.setState`, including replacing store *actions* with spies,
  since zustand keeps them in state. They assert on what a user can see, never on internals, and
  call `afterEach(cleanup)` explicitly because the suite does not use vitest globals.

  Components worth testing are the ones that **decide** something: which card a route shows,
  whether a guard holds, what a control commits. The presentational leaves (`PaperDisplay`,
  `HeadToHeadScore`, `PlayerAvatar`, `GamesPlayedPaperDisplay`) are props-to-JSX and are
  deliberately left alone — testing them moves the coverage number and catches nothing.
- `test/*.spec.ts` — Playwright-Electron specs against the built app, run by `vitest.config.ts`.

  **What belongs here and what does not.** These are slow and each one launches Electron, so a
  spec earns its place only by covering something the jsdom and Node suites *cannot reach*: the
  preload bridge and real IPC, real IndexedDB through localforage, real `utilityProcess` forking
  and structured-clone across the process boundary, `fs.watch`, and `HashRouter` over `file://`.
  Rendering logic, guards and state machines belong in `test/unit`, where they cost milliseconds.

  - `e2e.spec.ts` — startup smoke test.
  - `import.spec.ts` — the import path end to end, and the identity prompt over real data.
  - `live.spec.ts` — a `.slp` copied into the watched directory while the app runs: the only
    cover for `fs.watch` → parse → `live-replay-loaded` → the head-to-head card, and for the app
    identifying the user from a game without being asked.
  - `workerPool.spec.ts` — 30 replays, so the pool forks *several* processes. Every other spec
    imports seven files, which is one worker, so this is the only place parallel dispatch and
    structured-clone-at-volume actually run. The assertion is that every file is stored exactly
    once: a batch handed out twice or dropped lands as a count that is not 30.
  - `backfill.spec.ts` — the one-time schema migration against real IndexedDB, which every
    existing user hits once on upgrade. It damages a stored row, then shows that an ordinary
    restart leaves the damage and a version bump repairs it. The first half is the control; without
    it the second proves nothing.
  - `persistence.spec.ts` — settings round-tripping through real IndexedDB, a reload on a
    non-root route, and `dropDB` actually emptying all three stores.

  Specs inject `localforage` with `page.addScriptTag` and point it at database `db` when they need
  to read or seed storage, rather than poking IndexedDB directly — that way the test writes rows
  exactly the way the app does. Re-inject after every `page.reload()`. Note that `expect.poll` may
  only be called inside a test, so setup in `beforeAll` waits with Playwright's own
  `locator.waitFor` / `page.waitForFunction`. `import.spec.ts` drives a real import, stubbing only
  the native folder picker (via `electronApp.evaluate`), so the `select-directory` handler, the
  file walk, the `utilityProcess` workers, `SlippiGame` parsing and IndexedDB all run for real.
  Each spec writes a screenshot into `test/screenshots/`. Skipped on Linux.

  `fileParallelism` is off for this config: the app takes a single-instance lock, so a second
  Electron launch would quit on startup. `import.spec.ts` passes `--user-data-dir` pointing at a
  temp folder, so every run starts from an empty IndexedDB.

A test marked `// BUG` pins behavior the code gets wrong on purpose — see "Known bugs" in
`src/CLAUDE.md` before changing one.

## Architecture

```
electron/main  ──fs.watch(replay dir)──▶ forks utilityProcess workers
                                          (electron/worker/replayParser.ts)
                                                │ parse .slp with SlippiGame
                                                │ Replay objects back over IPC
                                                ▼
                                         electron/main (routes batches)
                                                │ insert-parsed-replays
                                                ▼
main renderer (src/replayStore.ts, zustand) ──▶ IndexedDB (localforage)
   acks each batch, then folds every replay into a FullStats object via
   src/utils/statUtils.ts, mutating it in place for each new live game.
```

Parsing parallelism uses **`utilityProcess` workers** — Node processes with no Chromium, and
therefore **no IndexedDB**. That is why the renderer, not the worker, writes: the main renderer is
the single writer, and its ack for each batch is the backpressure that releases the worker's next
one. Worker count is capped by memory, not cores — see `electron/CLAUDE.md`.

## Slippi / Melee glossary

- **Connect code** — `ABCD#123`. The player identity used for every match, lookup and grouping.
  A replay with no connect code is rejected.
- **Stock** — a life. A stock with an `endFrame` is one that was lost.
- **Character id / stage id** — numeric in the `.slp` file but **stored and compared as strings**
  everywhere in this codebase (`.toString()` at parse time). Name tables live in
  `src/utils/meleeIdUtils.ts`, along with `LEGAL_STAGE_IDS` (tournament-legal stages) — the one
  place ids are plain numbers, so compare against it carefully.
- **Matchup** — your character vs the opponent's character. Stats are kept overall, per stage,
  per matchup, and per matchup-and-stage.
- **Head-to-head** — stats narrowed to a single opponent connect code.
- **Ranked / unranked** — `Replay.mode`, derived from `settings.matchInfo.matchId`. Only
  `mode.ranked*` is ranked; direct, unranked and every pre-slp-3.14 replay with no matchId are
  unranked. Ranked games are the only ones that form **sets** (`gameNumber` > 1); unranked games
  each get their own matchId and are always game 1. A replay stored before this field existed has
  no `mode` at all — absent means unranked.
- **Live replay** — the in-progress `.slp` the watcher sees before the game has a winner.
- **Rank** — a player's ranked standing (Bronze 1 … Grandmaster, from a `ratingOrdinal`). It is
  **not in the `.slp` file at all** and is fetched per connect code from slippi.gg; only *current*
  rank exists, so it can never be attached to a stored replay. See "Rank lookups" in
  `electron/CLAUDE.md` before touching it — the request policy there is deliberate.

## Gotchas

- There is **no** Dolphin/console/relay connection — everything is driven by watching the replay
  directory for files.
- The app makes exactly two kinds of outbound request: the updater, and the rank lookup in
  `electron/main/rankService.ts`. Both are against servers that may be unreachable, and neither may
  ever be fatal.
- The `electron-vite-react` template's comments (`// #298`) are still scattered around. Its other
  leftovers (`.vite.config.flat.txt`, `.playwright.config.txt`, the unused `ws` dependency, the
  placeholder `appId: "YourAppID"` — now `com.meleedex.app`) have been removed.
- `testdata/` holds 8 files. Seven are `*.slp`, of which six are valid and
  `Game_20250422T214211.slp` is 24 frames long and rejected as too short.
  `Game_20220901T221616.slp.old` parses fine but the file walk only matches `*.slp`, so the app
  never sees it.

## Going deeper

- Editing `electron/` (main process, IPC, replay loading) → read `electron/CLAUDE.md`.
- Editing `src/` (renderer, UI, store, stats) → read `src/CLAUDE.md`.
