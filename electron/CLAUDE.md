# electron/ — main process

Read the root `CLAUDE.md` first for commands and the overall data flow.

## Process model

- `electron/main/index.ts` — single-instance lock, Win7 GPU disable, `setAppUserModelId` on win32.
  Importing `./ipc` is what registers every handler.
- `electron/main/utils.ts` — `createMainWindow()`, `getNumberOfWorkers()`, `getReplayFiles()`.
  `getReplayFiles` is one `fs.promises.readdir(dir, { recursive: true, withFileTypes: true })`,
  building each path from the entry's `parentPath`.
- `electron/main/parserWorker.ts` — `ParserWorker`, one `utilityProcess` and its ready/crash handling.
- `electron/worker/` — `replayParser.ts` (the worker entry) and `protocol.ts` (the message contract).
- `electron/main/replayLoadManager.ts` — the singleton `ReplayLoadManager`, owning both the bulk
  import and the live watcher.
- `electron/main/rankService.ts` — the slippi.gg rank lookup. See below.
- `electron/preload/index.ts` — exposes the bridge as `window.ipcRenderer`.

### Parser workers

`ParserWorker` forks `electron/worker/replayParser.ts` as a **`utilityProcess`** — a plain Node
process with no Chromium and therefore **no IndexedDB**. Workers only parse: they return `Replay`
objects to main, which forwards them to the main renderer, the single writer to IndexedDB. The
renderer acks each batch on `replays-inserted`, and that ack is both the progress signal and the
backpressure that releases the worker's next batch.

The worker passes `readFinalStocks` from `electron/worker/tailReader.ts` into `parseGameToReplay`,
which is the only call site. It is a shortcut past `getStats()` for replays slippi-js cannot resolve
a winner for — see "The three tiers" in `src/CLAUDE.md`. It lives here rather than in `src/` because
it reads the file with `node:fs`, and `src/replayParsing.ts` is imported by the renderer too.

**That module is the one place in the codebase that knows the `.slp` byte layout** — where the raw
event block starts, how the payload-sizes header works, and four field offsets inside a
`POST_FRAME_UPDATE`. That knowledge is normally slippi-js's job, so the module is written to give up
rather than guess: every failure is `null`, which falls through to the full parse. Answering wrongly
would silently record the loser as the winner, which is why `test/unit/tailReader.test.ts` spends
most of its length on truncated and malformed files.

`getNumberOfWorkers` is `min(cores - 1, 6, ceil(files / 10))`. The cap is 6 because each worker's
peak footprint is the parsed frame data (~200MB for a 1.4MB replay, ~300MB for a 9MB one), not the
process baseline — throughput knees long before memory does (measured on 20 cores over 150
replays: 4 workers 7.8s, 6 workers 6.1s, 8 workers 4.9s, 15 workers 4.2s). Batch size is a flat
`PARSE_BATCH_SIZE = 10` from `electron/worker/protocol.ts`.

All workers are retired when the queue drains, so an idle app runs no parser process. A live game
forks a fresh one (~294ms measured on Electron 44 / slippi-js 9, down from ~575ms on Electron 33 /
slippi-js 6 — irrelevant either way on a path that runs once per finished game).

If a worker dies mid-batch its files are requeued and re-parsed **one at a time**; a file that
kills a worker while isolated is filed as a bad replay, which is what stops the retry loop. The
crashed worker is also scrubbed from `awaitingInsert`: a dead worker's `parse` silently refuses
work, so dispatching to it on the ack would splice a batch off the queue and lose it.

### Two ingest paths

1. **Bulk import** — the renderer sends `begin-loading-replays` with the replay directory and
   every already-known replay name (from both the `replays` and `badReplays` stores). The manager
   walks the tree for `*.slp`, diffs the names through a `Set`, and hands batches to workers. The
   handler **awaits the manager and returns whether an import started**: the renderer raises its
   progress bar only on `true`, because when the manager declines, no `end-loading-replays` is
   coming and the bar would never come down.
2. **Live** — `fs.watch(directory, { recursive: true })` builds a `SlippiGame` per event and emits
   `live-replay-loaded`. Once the game has winners and more than 30s of frames, the file is queued
   for normal loading. `ingestedLiveFiles` holds the paths already queued: `fs.watch` keeps firing
   for a finished replay and the watcher is re-attached after every load, so without it the same
   game is ingested, and counted, repeatedly. `update-stats` follows **only if the parser accepted
   the file**, and carries its `replayName` — a rejected live game (a CPU match, a parse failure)
   stores nothing, and announcing it would make the renderer re-count its previous replay.

### Rank lookups

The `.slp` format carries **no rank** — not in the game-start header, not in the metadata, not
anywhere in the bytes. It names only which queue the game was in, which is already `Replay.mode`.
Current standing therefore comes from slippi.gg, over `POST https://internal.slippi.gg/graphql`,
`getUser(connectCode:)` → `rankedNetplayProfile`. Verified against the live endpoint: it is public
and unauthenticated, an unknown code answers HTTP 200 with `data.getUser: null`, and the sibling
`getUsers(fbUids:)` is **not** public — it answers `UNAUTHORIZED`. Introspection is disabled.

**Only current rank exists.** What either player was ranked at the time of a stored replay is not
recorded locally or remotely, so there is nothing to backfill and no reason to ever fan out over
the library.

This is an undocumented internal endpoint — `internal.` in the hostname is Slippi saying it is not
a contract — so the service is built to keep the traffic negligible and to stop the moment it is
unwelcome. The constants live at the top of `rankService.ts`; the policy is: one request per
connect code per TTL (30 min, 6 h for a miss), in-flight lookups coalesced, never a poll, never a
bulk lookup, no retry, and a 429/403 — or a GraphQL `UNAUTHORIZED`/`FORBIDDEN`, or three
consecutive failures — disables lookups for the rest of the session.

**A GraphQL error is HTTP 200 with `data.getUser: null`, which is the same shape as a player who
has no ranked profile.** Conflating them is how this becomes a misbehaving client: a refusal would
read as "unranked", get cached for the negative TTL, leave the breaker untouched, and the app would
carry on asking. So a non-empty `errors` array is a failure, never an answer — it is not cached, it
feeds the breaker, and an auth-shaped code stops the session at once. `!response.ok` alone does not
cover this, because the refusal never reaches the status line. A descriptive `User-Agent` names the app so the traffic can be identified, or blocked,
deliberately. **Do not relax these without a reason.** A play session is ~10-20 requests.

It lives in main, not the renderer, because the packaged renderer loads over `file://`, where a
cross-origin fetch is CORS-blocked. Nothing in it throws: every failure is a `null`, which the card
renders as no badge. Tier names are derived separately in `src/utils/rankUtils.ts`, which is pure,
so the thresholds are testable without a network stub.

## IPC channels

Renderer → main (`ipcMain.handle`): `get-app-version`, `check-for-updates`, `select-directory`,
`begin-loading-replays` (returns whether an import started), `replays-inserted`,
`get-rank-profile` (`{ connectCode }` → `RankProfile | null`, never rejects).

Main → main renderer: `update-ready`, `update-replay-load-progress`, `live-replay-loaded`,
`insert-parsed-replays`, `end-loading-replays`, `update-stats` (`{ replayName }`),
`replay-directory-unreadable` (`{ replayDirectory }`).

Main ↔ worker (`utilityProcess` messages, not `ipcMain`): `parse` out, `ready` / `parsed` back.

## Tests

`test/unit/replayLoadManager.test.ts` and `test/unit/electronUtils.test.ts` run the real main-process
code in Node with its surroundings faked: `test/helpers/fakeParserWorker.ts` stands in for the
`utilityProcess` (tests drive `finishBatch` / `crash` on it), and `node:fs`, `./utils` and
`./vite_constants` are mocked so the file walk, the renderer and `SlippiGame` are all controllable.
The pool logic, the ack backpressure, the crash isolation and the live watcher are the code
actually under test.

Two things to know before adding to them. `ReplayLoadManager` is a singleton, so each test clears
its private static rather than calling `vi.resetModules()` — resetting the registry would hand the
mock factory a *second* copy of the fake worker module, and the instances the test inspects would
not be the ones the pool built. And `NUM_CORES` in `utils.ts` is read once at import, so a
different machine is simulated by reloading that module.

`test/unit/replayParser.test.ts` covers the worker entry itself. `process.parentPort` only exists
inside a utilityProcess and the module talks to it at import time, so the stub has to be attached
to `process` **before** the module is imported, and `createRequire` is mocked to hand back the real
`slippi-js`. The `.slp` files and the parsing are real — the two smallest in `testdata/`, so it
stays fast.

`test/unit/rankService.test.ts` covers the rank lookup with `fetch` stubbed: the caching, the
in-flight coalescing, the negative cache, the eviction cap and every way the service gives up.
There is deliberately **no** Playwright spec for it — a spec that depends on a live third-party
endpoint is a flaky test plus real traffic on every CI run. For the same reason every
`electron.launch` in `test/*.spec.ts` sets `MELEE_DEX_DISABLE_RANK_LOOKUPS=1`: those specs drive a
real live game through the real app, so without it the suite would hit slippi.gg on every run. Keep
it on any spec added later. The app never sets it.

`test/live.spec.ts` covers the same path end to end for real: a `.slp` is copied into a temp replay
directory while the app runs, and the assertion is that the dashboard swaps to the head-to-head
card. Nothing is faked there but the folder picker.

## Gotchas

- `VITE_DEV_SERVER_URL` is the dev/prod switch throughout. `electron/main/vite_constants.ts` sets
  `APP_ROOT` and `VITE_PUBLIC` **as an import side effect**, so import order matters.
- The preload path is hardcoded as `../preload/index.mjs` — note the `.mjs`. Renaming the preload
  output breaks the app silently.
- `slippi-js` is CJS and externalized from the main bundle, so it is pulled in with `require()`,
  not an ESM import, and resolved from `node_modules` at runtime. The worker does the same.
- It is required as **`@slippi/slippi-js/node`**, never the bare package name. Since v8 the default
  entry is the *browser* build, whose `SlippiGame` takes a `BinaryLike` rather than a file path, so
  the bare id would typecheck and then fail on every replay. The subpath is why `tsconfig.json`
  needs `"moduleResolution": "Bundler"` — node10 resolution does not read the `exports` field.
  `test/unit/replayParser.test.ts` fakes `createRequire` and matches the id literally, so it has to
  move in step.
- The worker is built as a second entry of the **main** build (`vite.config.ts` → `main.entry`),
  landing at `dist-electron/main/replayParser.js`, which is what `WORKER_ENTRY` points at. It is
  forked from inside `app.asar` in the packaged app, which works — but it means
  `src/replayParsing.ts` must stay free of any runtime import that cannot load in Node, hence the
  `import type` on its `db/replays` and `slippi-js` imports.
- **A parser worker's ~200MB is mostly V8 free-list, and you cannot cap it.** Only ~25MB is live
  data; the rest is garbage V8 never collects, because a bare Node `utilityProcess` gets a 4096MB
  heap limit and no memory-pressure signal. Measured as inert in Electron 33 and re-measured on
  Electron 44 (Node 24, V8 15.2) with the same answer: `execArgv`, `NODE_OPTIONS` and
  `app.commandLine.appendSwitch("js-flags", ...)` all leave `heap_size_limit` at ~4096. On 44 an
  `execArgv` handed to `utilityProcess.fork` *does* now reach the child's `process.execArgv` — but
  V8 still ignores it, so watching the flag arrive is not the same as it taking effect. A forced
  GC frees the heap (69MB → 25MB) without returning pages to the OS
  (RSS 159 → 158). It plateaus rather than leaking, so **worker count is the only lever** — and
  it is linear.
- The watcher uses `path.join` / `path.basename` on what `fs.watch` hands back, which on Windows
  is a backslash-separated relative path. A replay stored under the wrong name can never be
  matched by the import, so it would be re-imported on every launch. Do not shadow the `path`
  module with a local named `path` in that handler.
- `ingestedLiveFiles` is capped at `MAX_INGESTED_LIVE_FILES` and drops its oldest entry, since
  `Set` iterates in insertion order. It only exists to spot repeats, which arrive moments apart.
- `fs.watch` fires on partial writes, and the handlers wrap everything in bare `try {} catch {}`.
  Live-detection failures are therefore completely silent — add logging before concluding the
  watcher is not firing. `listenForReplayFile` attaches no watcher at all if the directory does
  not exist, because `fs.watch` throws outright in that case.
- Rejected replays (under 30s, not exactly 2 human players, missing connect code / character /
  stage, no winner) go to the `badReplays` store and are **permanently skipped** on every later
  import. A file still being written when a bulk import reads it is therefore only counted if the
  live watcher picks it up when the game ends.
- The updater runs **only in a packaged app**: `forceDevUpdateConfig` is left at its default, so
  `isUpdaterActive()` is false in dev and the check is skipped rather than reaching for a
  `dev-app-update.yml` that no longer exists. `Layout.tsx` triggers `check-for-updates` on mount;
  the handler awaits and catches, because an unreachable update server is routine and must never
  be fatal. CI (`.github/workflows/build.yml`) only publishes on `v*` tags, windows-latest, and
  its artifact names track `productName`.
- `windowState.ts` persists size and position to `window-state.json` in `userData`. It refuses to
  restore a window smaller than `MIN_WIDTH`/`MIN_HEIGHT`, or one positioned on a monitor that is
  no longer attached — that failure looks exactly like the app not starting. It saves
  `getNormalBounds()`, so a maximized window remembers the size to restore *to*.
- `vite.config.ts` `rmSync`s `dist-electron` every time the config loads.
