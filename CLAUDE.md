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

- `test/unit/` — parsing, stat aggregation, the db layer and the store, run by
  `vitest.unit.config.ts` in Node. `test/helpers/` holds an in-memory `KeyValueStore` fake, a
  `Replay` builder and a fake `ipcRenderer`, so no IndexedDB, browser or Electron is needed.
  `replayParsing.test.ts` parses the real `.slp` files in `testdata/` and is most of the ~10s
  runtime.
- `test/*.spec.ts` — Playwright-Electron specs against the built app, run by `vitest.config.ts`.
  `e2e.spec.ts` is the startup smoke test. `import.spec.ts` drives a real import, stubbing only
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
- **Live replay** — the in-progress `.slp` the watcher sees before the game has a winner.

## Gotchas

- `.vite.config.flat.txt` and `.playwright.config.txt` are dead leftovers from the
  `electron-vite-react` template, not live config. Same origin: the template comments (`// #298`)
  and `electron-builder.json`'s placeholder `appId: "YourAppID"`.
- `ws` is a dependency used nowhere. There is **no** Dolphin/console/relay connection —
  everything is driven by watching the replay directory for files.
- `testdata/` holds 8 files. Seven are `*.slp`, of which six are valid and
  `Game_20250422T214211.slp` is 24 frames long and rejected as too short.
  `Game_20220901T221616.slp.old` parses fine but the file walk only matches `*.slp`, so the app
  never sees it.

## Going deeper

- Editing `electron/` (main process, IPC, replay loading) → read `electron/CLAUDE.md`.
- Editing `src/` (renderer, UI, store, stats) → read `src/CLAUDE.md`.
