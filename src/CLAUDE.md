# src/ — renderer

Read the root `CLAUDE.md` first for commands and the overall data flow.

One entry point builds from this directory:

- `main.tsx` → `App.tsx` (`HashRouter`; routes `/` → DashboardPage and `/settings` → SettingsPage)
  → `Layout.tsx` (MUI dark theme, AppBar, update Snackbar). `HashRouter` is required because the
  packaged app loads over `file://`.

`replayParsing.ts` holds the `.slp` → `Replay` mapping (`parseGameToReplay`, `tryGetWinner`,
`isReplayValid`). It imports no Electron and is therefore testable in Node — and it is **also
bundled into the `utilityProcess` parser worker**, so its `db/replays` and `slippi-js` imports
must stay `import type`, or localforage follows it into a process with no IndexedDB.

This renderer is the **only writer to IndexedDB**. Workers parse, main routes, and
`replayStore.ts` commits each batch on `insert-parsed-replays` and acks it with
`replays-inserted`. See `electron/CLAUDE.md` for the worker pool.

Writes are **per batch, not per replay**: `insertReplays` / `insertBadReplays` take the whole
batch, because localforage opens an IndexedDB transaction per `setItem` and awaiting two of them
per replay made the import 20 serialized round trips per batch of 10. Batches are still committed
one after another — `pendingWrites` chains them, and that chain is what keeps the ack, and so the
pool's backpressure, in order.

## Conventions

- **MUI v7 with `sx` props, exclusively.** No CSS files, no Tailwind, no styled-components. Theme
  is `createTheme({ palette: { mode: "dark" } })` in `Layout.tsx`; fonts via `@fontsource/roboto`.
- One folder per component: `Foo/Foo.tsx` plus a `Foo/index.tsx` barrel that only re-exports.
  Folders nest to mirror the UI tree. Cards split into `XCard.tsx` / `XCardContent.tsx` /
  `XEmptyCardContent.tsx`.
- Path alias `@` → `src`.

## State

One zustand store, `src/replayStore.ts` (`useReplayStore`). IPC listeners are registered once
outside React in `setupReplayStoreIpcListeners()` (called from `main.tsx`) and write through
`useReplayStore.setState`. Consumers currently destructure the whole store, so any field change
re-renders them — match that pattern or introduce selectors deliberately, don't half-migrate.

`statInfo` is the legacy stat shape; `newStatInfo: FullStats` is the live one.

## Persistence

`src/db/stores.ts` creates three localforage instances on IndexedDB database `db`: `settings`,
`replays`, `badReplays`. Replays are keyed by filename. Settings keys are typed as
`"replayDirectory" | "username"`.

The logic lives in factories that take their stores as arguments — `createReplayRepository` in
`replayRepository.ts` and `createSettingsRepository` in `settingsRepository.ts`, both depending on
a small `KeyValueStore` interface rather than on localforage. `db/replays.ts` and `db/settings.ts`
are thin modules that instantiate those against the real stores and re-export each function by
name, so **call sites import from them exactly as before**. Tests build their own repository over
an in-memory store.

Note that `iterate` stops early if its callback returns anything other than `undefined` — give
callbacks a block body.

The `replays` store holds **only replays**. It used to also hold a `latestReplayKey` pointer,
which made `selectReplayCount` one too high and handed a bare string to anything iterating the
store. `deleteLegacyLatestReplayPointer`, called once from `loadReplayDirectory`, clears that row
out of a store that still has one; it and `LATEST_REPLAY_KEY` can both be deleted once it has run.

## Stats

All aggregation lives in `src/utils/statUtils.ts`. Everything funnels through one core:

- `applyReplayToStats(stats, replay, code)` — **the shared core.** Folds a single replay into a
  `FullStats` by mutating it in place, counting it into the overall / stage / matchup /
  matchup-and-stage buckets and the per-opponent record together. Every path below ends up here,
  so this is what you edit to change how a replay is counted. It skips replays the user did not
  play in, and **always returns `stats`** — the store writes the result straight back into
  `newStatInfo`, so returning nothing would blank the dashboard.

Each of the four buckets is the same upsert under a different key: `countGameInStats` calls
`countGameInRow(rows, matches, createRow, isWin)`, which finds the row or pushes a zeroed one and
then counts the game into it.

The two ways a `FullStats` gets built:

- `getStats(code)` — the batch path, run once on `end-loading-replays`. **Streams** via
  `executeCallbackOnEachReplay` straight into the core, so a large replay library is never
  materialized into an array. It deliberately does **not** call `buildStats`. Keep it that way.
- `buildStats(replays, code)` — pure fold over any iterable of replays. **Used only by the unit
  tests**, which need to build a `FullStats` synchronously without IndexedDB; production always
  goes through `getStats`.

The live path, run on `update-stats` when a game finishes:

- `updateStatsWithReplay(stats, code, replayName)` — the DB adapter. `replayName` comes from the
  `update-stats` payload: main names the replay it just stored. It deliberately does **not** read
  the latest-replay pointer — a rejected live game stores nothing, and the pointer would hand back
  the *previous* replay to be counted a second time.

Derived, pure:

- `getCurrentHeadToHeadStats(stats, currentReplayInfo, code)` — narrows a `FullStats` to the
  single-opponent view the dashboard renders. One pass over the matchup rows, totalling each
  side's character usage into a `Map`.
- `getMostRecentMatches(replays, n)` — only consumer is `RecentMatchesCardContent.tsx`, which is
  one of the legacy cards (see Gotchas), so it is effectively dead in production.
- `createEmptyFullStats()` — the zero value `getStats` and `buildStats` start from. The live
  path never calls it; it folds into the `FullStats` the store already holds.

The batch and live paths must stay in agreement; `test/unit/statUtils.test.ts` asserts that
applying a replay incrementally equals rebuilding from scratch with it appended.

`Stats` = overall + per-stage + per-matchup + per-matchup-and-stage. `FullStats` = a global `Stats`
plus `opponentSpecificStats: OpponentStats[]`. Shared types are in `src/types.d.ts`.

## Gotchas

- **Two generations of dashboard cards.** In
  `src/components/DashboardPage/LiveMatchDisplay/LiveMatchDisplay.tsx`, only `NewHeadToHeadCard/`
  and `NewUserStatsCard/UserStatsCard.tsx` render; `CurrentMatchCard`, `HeadToHeadCard`,
  `UserStatsCard` and `RecentMatchesCard` are legacy and commented out (though still imported).
  The new files share filenames with the legacy ones and are imported under aliases.
  `NewUserStatsCard` has no `index.tsx`. Edit the `New*` ones.
- `src/assets/characterIcons/getCharacterIcon.ts` is a 26-case switch that **falls back to
  Captain Falcon (id 0)**, so an unknown character id renders as Falcon instead of erroring.
- `tryGetWinner` in `replayParsing.ts` inverts the player index on purpose — more stocks *lost*
  means the *other* player won. It reads like an off-by-one bug; it is not.
- `electron/worker/replayParser.ts` swallows parse errors in bare `try/catch`, same as the main
  process; anything that throws is filed as a bad replay.
- `src/type/electron-updater.d.ts` is unused.

## Known behavior quirks

These are bugs. The unit suite **asserts them as-is** so that refactors stay honest; each has a
`// BUG` comment at the test. If you fix one, update its test in the same change — don't delete it.

1. ~~`getCurrentHeadToHeadStats` opponent play rate accumulates past 100%~~ — **fixed.** Both
   sides now total into a `Map` in one pass. Numbering is kept so the remaining `// BUG`
   references still line up.
2. `getMostRecentMatches` — sorts the caller's array in place, reordering it as a side effect.
3. `selectReplayCount` — counts the `latestReplayKey` pointer, so it is always one too high.
4. `executeCallbackOnEachReplay` — yields that pointer's **string** value as if it were a
   `Replay`; this is why the stat code uses `replay.players?.` rather than `replay.players.`.
5. ~~`getMostCommonUser([])` returns `undefined` against an empty store~~ — **fixed.** It returns
   `""`, as its signature always promised; the startup path used to call `.toUpperCase()` on the
   `undefined` and throw, leaving a first run stuck on the loading bar.
6. ~~`getMostCommonUser` returns the **second** candidate on a tie~~ — **fixed.** Candidates
   arrive in the live game's port order, so the tie-break was decided by which port the players
   plugged into. It takes the first now. A tie is genuinely undecidable from counts — it is what
   a library of games against a single opponent looks like — so the real answer is a connect
   code set in Settings.
7. `tryGetWinner` — equal stock counts yield no winner, so the replay is filed as bad and never
   counted.
8. ~~`isReplayValid` **throws** on a one-player replay~~ — **fixed.** The player-count check
   returns early instead of falling through into `players[1]`.

Still live: #2 and #7. #7 is by design — see "No winner" below.

## No winner

`tryGetWinner` falls back to counting stocks lost only when `game.getWinners()` comes back empty,
which for a **completed** game means slippi-js could not name one: a `NO_CONTEST` with no LRAS
initiator, a genuine time-out draw, or — the common case here — an older replay whose `GAME_END`
payload predates placements. A normally finished game always has unequal stocks lost, so the
fallback resolves it.

Equal stocks lost therefore means the game really has no winner, or was never finished. Filing it
as a bad replay is the intended outcome, **not** a bug. The one consequence worth knowing: bad
replays are skipped permanently, so an in-progress file caught by a bulk import is never counted
unless the live watcher picks it up when the game ends — which only happens if the app stays open.
