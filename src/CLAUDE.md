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
`replays`, `badReplays`. Replays are keyed by filename, and the `replays` store holds **only**
replays. Settings keys are typed as `"replayDirectory" | "username"`.

The logic lives in factories that take their stores as arguments — `createReplayRepository` in
`replayRepository.ts` and `createSettingsRepository` in `settingsRepository.ts`, both depending on
a small `KeyValueStore` interface rather than on localforage. `db/replays.ts` and `db/settings.ts`
instantiate those against the real stores and re-export each function by name, so **call sites
import from them exactly as before**. Tests build their own repository over an in-memory store.

Writes are **per batch, not per replay**: `insertReplays` / `insertBadReplays` take the whole
batch, because localforage opens an IndexedDB transaction per `setItem`. Batches are committed one
after another — `pendingWrites` chains them, and that chain is what keeps the ack, and so the
pool's backpressure, in order.

`iterate` stops early if its callback returns anything other than `undefined` — give callbacks a
block body.

`deleteLegacyLatestReplayPointer` clears a `latestReplayKey` row that older versions kept in the
`replays` store. It and `LATEST_REPLAY_KEY` can both be deleted once it has run.

## Stats

All aggregation lives in `src/utils/statUtils.ts`, and everything funnels through one core:

- `applyReplayToStats(stats, replay, code)` — folds a single replay into a `FullStats` by mutating
  it in place, counting it into the overall / stage / matchup / matchup-and-stage buckets and the
  per-opponent record together. This is what to edit to change how a replay is counted. It skips
  replays the user did not play in, and **always returns `stats`** — the store writes the result
  straight back into `newStatInfo`, so returning nothing would blank the dashboard.

Each of the four buckets is the same upsert under a different key: `countGameInStats` calls
`countGameInRow(rows, matches, createRow, isWin)`, which finds the row or pushes a zeroed one and
then counts the game into it.

Building a `FullStats`:

- `getStats(code)` — the batch path, run once on `end-loading-replays`. **Streams** via
  `executeCallbackOnEachReplay` straight into the core, so a large replay library is never
  materialized into an array. It deliberately does **not** call `buildStats`. Keep it that way.
- `buildStats(replays, code)` — pure fold over any iterable. **Used only by the unit tests**,
  which need to build a `FullStats` synchronously without IndexedDB; production uses `getStats`.
- `updateStatsWithReplay(stats, code, replayName)` — the live path, run on `update-stats`.
  `replayName` comes from the IPC payload: main names the replay it just stored. It deliberately
  does **not** look up "the latest replay" — a rejected live game stores nothing, and the previous
  replay would be counted a second time.

The batch and live paths must stay in agreement; `test/unit/statUtils.test.ts` asserts that
applying a replay incrementally equals rebuilding from scratch with it appended.

Derived, pure:

- `getCurrentHeadToHeadStats(stats, currentReplayInfo, code)` — narrows a `FullStats` to the
  single-opponent view the dashboard renders, totalling each side's character usage into a `Map`
  in one pass over the matchup rows.
- `getMostRecentMatches(replays, n)` — only consumer is `RecentMatchesCardContent.tsx`, a legacy
  card (see Gotchas), so it is effectively dead in production.
- `createEmptyFullStats()` — the zero value `getStats` and `buildStats` start from. The live path
  never calls it; it folds into the `FullStats` the store already holds.

`Stats` = overall + per-stage + per-matchup + per-matchup-and-stage. `FullStats` = a global `Stats`
plus `opponentSpecificStats: OpponentStats[]`. Shared types are in `src/types.d.ts`.

## No winner

`tryGetWinner` falls back to counting stocks lost only when `game.getWinners()` comes back empty,
which for a **completed** game means slippi-js could not name one: a `NO_CONTEST` with no LRAS
initiator, a time-out with stocks and percent tied, or an older replay whose `GAME_END` payload
predates placements. A normally finished game always has unequal stocks lost, so the fallback
resolves it. Equal stocks lost therefore means the game really was a draw or was never finished,
and filing it as a bad replay is the intended outcome.

`tryGetWinner` inverts the player index on purpose — more stocks *lost* means the *other* player
won. It reads like an off-by-one; it is not.

## Identifying the user

`determineUserBasedOnLiveGame` prefers the configured username when that player is in the live
game, and otherwise takes whichever of the two appears in more stored replays. A tie goes to the
first candidate, but candidates arrive in the live game's port order, so a tie is not meaningfully
decidable — and every replay in a single-opponent library contains both players, which ties by
construction. The connect code in Settings is what resolves that case.

## Gotchas

- **Two generations of dashboard cards.** In
  `src/components/DashboardPage/LiveMatchDisplay/LiveMatchDisplay.tsx`, only `NewHeadToHeadCard/`
  and `NewUserStatsCard/UserStatsCard.tsx` render; `CurrentMatchCard`, `HeadToHeadCard`,
  `UserStatsCard` and `RecentMatchesCard` are legacy and commented out, though still imported.
  The new files share filenames with the legacy ones and are imported under aliases.
  `NewUserStatsCard` has no `index.tsx`. Edit the `New*` ones.
- `statInfo` and `headToHeadReplays` in the store are never written — only the legacy cards read
  them.
- `src/assets/characterIcons/getCharacterIcon.ts` is a 26-case switch that **falls back to
  Captain Falcon (id 0)**, so an unknown character id renders as Falcon instead of erroring.
- `electron/worker/replayParser.ts` swallows parse errors in a bare `try/catch`; anything that
  throws is filed as a bad replay.
- `src/type/electron-updater.d.ts` is unused.

## Known bugs

Pinned by a `// BUG` test so refactors stay honest. Fixing one means updating its test in the same
change — don't delete it.

- `getMostRecentMatches` sorts the caller's array in place, reordering it as a side effect.
