# electron/ — main process

Read the root `CLAUDE.md` first for commands and the overall data flow.

## Process model

- `electron/main/index.ts` — single-instance lock, Win7 GPU disable, `setAppUserModelId` on win32.
  Importing `./ipc` is what registers every handler.
- `electron/main/utils.ts` — `createMainWindow()`, `getNumberOfWorkers()`, `getReplayFiles()`.
- `electron/main/parserWorker.ts` — `ParserWorker`, one `utilityProcess` and its ready/crash handling.
- `electron/worker/` — `replayParser.ts` (the worker entry) and `protocol.ts` (the message contract).
- `electron/main/replayLoadManager.ts` — the singleton `ReplayLoadManager`, which owns both the
  bulk import and the live watcher.
- `electron/preload/index.ts` — exposes the bridge as `window.ipcRenderer`.

### Parser workers

`ParserWorker` forks `electron/worker/replayParser.ts` as a **`utilityProcess`** — a plain Node
process with no Chromium and therefore **no IndexedDB**. Workers only parse: they return `Replay`
objects to main, which forwards them to the main renderer, which is the single writer to
IndexedDB. The renderer acks each batch on `replays-inserted`, and that ack is both the progress
signal and the backpressure that releases the worker's next batch.

`getNumberOfWorkers` is `min(cores - 1, 6, ceil(files / 10))`. The cap is 6 because each worker's
peak footprint is the parsed frame data (~200MB for a 1.4MB replay, ~300MB for a 9MB one), not the
process baseline — throughput knees long before memory does. Batch size is a flat
`PARSE_BATCH_SIZE = 10` from `electron/worker/protocol.ts`.

All workers are retired when the queue drains, so an idle app runs no parser process. A live game
forks a fresh one (~575ms, which is irrelevant on a path that runs once per finished game).

If a worker dies mid-batch its files are requeued and re-parsed **one at a time**; a file that
kills a worker while isolated is filed as a bad replay, which is what stops the retry loop.

**This used to be a pool of invisible `BrowserWindow`s** loading a `workerRenderer.html`, which
wrote to IndexedDB directly. See the git history if you find stale references.

### Two ingest paths

1. **Bulk import** — the renderer sends `begin-loading-replays` with the replay directory and every
   already-known replay name (from both the `replays` and `badReplays` stores). The manager walks
   the tree for `*.slp`, diffs, and hands batches to workers.
2. **Live** — `fs.watch(directory, { recursive: true })` builds a `SlippiGame` per event and emits
   `live-replay-loaded`. Once the game has winners and more than 30s of frames, the file is queued
   for normal loading and `update-stats` follows.

## IPC channels

Renderer → main (`ipcMain.handle`): `get-app-version`, `check-for-updates`, `select-directory`,
`begin-loading-replays`, `replays-inserted`.

Main → main renderer: `update-ready`, `update-replay-load-progress`, `live-replay-loaded`,
`insert-parsed-replays`, `end-loading-replays`, `update-stats`.

Main ↔ worker (`utilityProcess` messages, not `ipcMain`): `parse` out, `ready` / `parsed` back.

## Gotchas

- `VITE_DEV_SERVER_URL` is the dev/prod switch throughout. `electron/main/vite_constants.ts` sets
  `APP_ROOT` and `VITE_PUBLIC` **as an import side effect**, so import order matters.
- The preload path is hardcoded as `../preload/index.mjs` — note the `.mjs`. Renaming the preload
  output breaks the app silently.
- `slippi-js` is CJS and externalized from the main bundle, so it is pulled in with `require()`,
  not an ESM import, and resolved from `node_modules` at runtime. The worker does the same.
- The worker is built as a second entry of the **main** build (`vite.config.ts` → `main.entry`),
  landing at `dist-electron/main/replayParser.js`, which is what `WORKER_ENTRY` points at. It is
  forked from inside `app.asar` in the packaged app, which works — but it means
  `src/replayParsing.ts` must stay free of any runtime import that cannot load in Node, hence the
  `import type` on its `db/replays` and `slippi-js` imports.
- **A parser worker's ~200MB is mostly V8 free-list, and you cannot cap it.** Only ~25MB is live
  data; the rest is garbage V8 never collects because a bare Node `utilityProcess` gets a 4096MB
  heap limit and no memory-pressure signal (the old renderer workers self-trimmed to ~142MB
  because Chromium sends them one). Measured as inert in Electron 33: `execArgv`, `NODE_OPTIONS`
  and `app.commandLine.appendSwitch("js-flags", ...)` all leave `heap_size_limit` at 4096, and a
  forced GC frees the heap (69MB → 25MB) without returning pages to the OS (RSS 159 → 158). It
  plateaus rather than leaking, so **worker count is the only lever** — and it is linear.
- Path handling is POSIX-flavored (`directory + "/" + filename`, `filename.split("/")`) even though
  `fs.watch` on Windows hands back backslash-separated relative paths. This is a live bug source
  for replays kept in subdirectories.
- `fs.watch` fires on partial writes, and the handlers wrap everything in bare `try {} catch {}`.
  Live-detection failures are therefore completely silent — add logging before concluding the
  watcher is not firing.
- Rejected replays (under 30s, not exactly 2 human players, missing connect code / character /
  stage) go to the `badReplays` store and are **permanently skipped** on every later import.
- The updater sets `autoUpdater.forceDevUpdateConfig = true` unconditionally, so in dev it reads
  `dev-app-update.yml` (localhost:5500). `Layout.tsx` triggers `check-for-updates` on mount.
  CI (`.github/workflows/build.yml`) only publishes on `v*` tags, windows-latest.
- `vite.config.ts` `rmSync`s `dist-electron` every time the config loads.
