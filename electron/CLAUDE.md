# electron/ — main process

Read the root `CLAUDE.md` first for commands and the overall data flow.

## Process model

- `electron/main/index.ts` — single-instance lock, Win7 GPU disable, `setAppUserModelId` on win32.
  Importing `./ipc` is what registers every handler.
- `electron/main/utils.ts` — `createMainWindow()`, `createInvisWindow()`, `getReplayFiles()`.
- `electron/main/replayLoadManager.ts` — the singleton `ReplayLoadManager`, which owns both the
  bulk import and the live watcher.
- `electron/preload/index.ts` — exposes the bridge as `window.ipcRenderer`.

### Worker windows

`createInvisWindow()` spawns up to ~10 `BrowserWindow`s loading `workerRenderer.html`, with
`nodeIntegration: true, contextIsolation: false` and `show: !app.isPackaged`. **In dev they are
visible windows with devtools open — that is by design, not a bug.** Count and batch size come
from `getNumberOfWorkers` (`min(max(10, cores/4), files/10)`) and `getBatchSize` (50, or 5 for
small jobs); windows are staggered 500ms apart. One worker is deliberately kept alive after import
finishes, to serve live games.

### Two ingest paths

1. **Bulk import** — the renderer sends `begin-loading-replays` with the replay directory and every
   already-known replay name (from both the `replays` and `badReplays` stores). The manager walks
   the tree for `*.slp`, diffs, and hands batches to workers.
2. **Live** — `fs.watch(directory, { recursive: true })` builds a `SlippiGame` per event and emits
   `live-replay-loaded`. Once the game has winners and more than 30s of frames, the file is queued
   for normal loading and `update-stats` follows.

## IPC channels

Renderer → main (`ipcMain.handle`): `get-app-version`, `check-for-updates`, `select-directory`,
`begin-loading-replays`, `request-replays-to-load`, `replay-loaded`.

Main → main renderer: `update-ready`, `update-replay-load-progress`, `live-replay-loaded`,
`end-loading-replays`, `update-stats`.

Main → worker: `start-load`.

## Gotchas

- `VITE_DEV_SERVER_URL` is the dev/prod switch throughout. `electron/main/vite_constants.ts` sets
  `APP_ROOT` and `VITE_PUBLIC` **as an import side effect**, so import order matters.
- The preload path is hardcoded as `../preload/index.mjs` — note the `.mjs`. Renaming the preload
  output breaks the app silently.
- `slippi-js` is CJS and externalized from the main bundle, so it is pulled in with `require()`,
  not an ESM import, and resolved from `node_modules` at runtime.
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
