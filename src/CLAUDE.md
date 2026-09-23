# src/ — renderer

Read the root `CLAUDE.md` first for commands and the overall data flow.

One entry point builds from this directory:

- `main.tsx` → `App.tsx` (`HashRouter`; routes `/` → DashboardPage, `/library` → LibraryPage and
  `/settings` → SettingsPage, all inside one `ErrorBoundary`) → `Layout.tsx` (MUI dark theme,
  AppBar whose nav comes from `NAV_LINKS`, update Snackbar). `HashRouter` is required because the
  packaged app loads over `file://`.

The dashboard is the **live** view and waits on `currentReplayInfo`; the library is the
**any-time** view and waits only on the import. Both boot the app through
`useReplayDirectory()` in `src/hooks/`, since either can be the first screen of a session.

`replayParsing.ts` holds the `.slp` → `Replay` mapping (`parseGameToReplay`, `tryGetWinner`,
`isReplayValid`, `getReplayMode`). `mode`, `matchId`, `gameNumber` and `lastFrame` all come from
the GAME_START header and the metadata slippi-js has already read, so they are free next to the
frame walk `tryGetWinner` may fall back to. They are **optional** on `Replay` and
`isReplayValid` deliberately does not check them: rows stored before they existed are still
valid, and `mode` absent means unranked. It imports no Electron and is therefore testable in Node — and it is **also
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

`newStatInfo: FullStats` holds the aggregated stats. The name is historical — the `statInfo`
field it replaced is gone.

Settings keys are `replayDirectory`, `username` and `schemaVersion`. `schemaVersion` drives the
one-time **backfill**: when `needsReplayBackfill()` says the stored replays predate
`REPLAY_SCHEMA_VERSION`, `loadReplayDirectory` passes an *empty* `existingReplayNames`, so every
file on disk is re-parsed and overwrites its row. It is stamped only when a load actually started
— a directory that has been moved must leave the backfill outstanding, not consume it — and rows
whose files are gone keep their old shape, which is why every field added to `Replay` stays
optional.

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

Each bucket is the same upsert under a different key: `countGameInStats` calls
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
- `getModeStat(stats, mode)` — one side of the ranked/unranked split, zeroed rather than
  undefined when that mode has no games.
- `createEmptyFullStats()` — the zero value `getStats` and `buildStats` start from. The live path
  never calls it; it folds into the `FullStats` the store already holds.

### Scale

Measured, not assumed. Per replay, building the stats costs:

| | 500 opponents | 3,000 | 10,000 |
| --- | --- | --- | --- |
| IndexedDB scan (`executeCallbackOnEachReplay`) | ~16.6us | ~16.6us | ~16.6us |
| Fold (`applyReplayToStats`) | 3.2us | 3.1us | 3.5us |

The fold is flat in the number of opponents **because of `opponentIndex`**. Before it, the same
numbers were 5.0us / 14us / 43.8us — finding the opponent row was a linear scan of an array that
grows with every new player met, so a 50,000-replay library against 10,000 opponents spent 2.2s
folding where it now spends 0.17s. Keep lookups going through the index; the remaining `find`s in
`countGameInStats` are over bounded row sets (stages, matchups) and do not show up.

A `FullStats` is roughly 13MB at 50,000 replays over 3,000 opponents, 32MB over 10,000.

The scan is the dominant cost again, which is the right place for it: it is one pass over
IndexedDB and it is what `selectRecentReplaysAgainst` also pays. Measure before optimizing either
further — `test/unit/statUtils.test.ts` asserts the incremental and batch paths agree, which is
what makes changes here safe.

`Stats` = overall + per-mode + per-stage + per-matchup + per-matchup-and-stage. `overallStat` is
the ranked and unranked `modeStats` rows combined, so the breakdown is always derivable and never
needs a second pass; read one side with `getModeStat(stats, mode)`, which zeroes rather than
returning undefined. `FullStats` = a global `Stats`
plus `opponentSpecificStats: OpponentStats[]` and `opponentIndex`, a `Map` over the *same*
objects. Push and index together, never one without the other. Shared types are in
`src/types.d.ts`.

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

Three rules, in order. Nothing else may write `username`.

1. **The configured connect code.** Entered in Settings, and trusted without confirmation.
2. **A game in progress.** It contains exactly two players and one of them is the user, so
   `identifyUserFromLiveGame` settles it — *and persists it* — whenever the library tells the two
   apart. When they appear equally often it returns `isConfident: false`: `getMostCommonUser`
   then falls through to the first candidate, candidates arrive in the live game's port order,
   and the answer is a coin flip. The code is still used for the session; it is not stored.
3. **Ask.** `getUserCandidates(n)` returns the commonest connect codes with their counts, and
   `NoIdentityCard` offers them for one click. `confirmUserConnectCode` stores the answer and
   rebuilds the stats against it.

The rule the old code broke was "never persist a guess": it stored the commonest player in the
library on first import, so a wrong guess was permanent, silent, and produced an
empty-but-present `FullStats` that crashed the general-stats card. `updateUsernameIfEmpty` was
that function and is gone — don't reintroduce it.

## The live view and the library

`DashboardPage` (`/`) waits on `currentReplayInfo`; `LibraryPage` (`/library`) waits only on the
import. The live card is built in tiers, and the ordering is load-bearing:

- **Tier 1** — who this is, and whether you have played — is drawn from `currentReplayInfo`
  **alone**, with `headToHeadStats` as enrichment. It used to be the other way round, so an
  opponent with no history rendered nothing: `getCurrentHeadToHeadStats` returns `null` for an
  unknown opponent, and the card returned `null` in turn. "You have never played this person" is
  the most useful thing the app can say, so it must not depend on having a record.
- **Tier 2** — character usage, this matchup, this stage, recent games — needs history and is
  absent without it.

Recent games are **queried per game**, not held in `FullStats`: a full cursor scan is ~16.6us per
stored replay (330ms over 20,000, 830ms over 50,000) and bucketing every opponent in the same
pass measures the same, so keeping the lists would not buy a cheaper scan, only a rarer one.
`handleLiveReplay` clears the list, publishes the rest of the view, then fills it in — and drops
the result if a newer game has started meanwhile.

Nothing on the live view is a control. There is no time to operate one mid-game, so the matchup
and stage rows read the game on screen rather than a dropdown; the `MatchupSelect` pair and the
four-column `StatsTable` that needed them are gone.

## Gotchas

- `NewHeadToHeadCard/` keeps a `New` prefix that no longer means anything — the legacy
  generation (`CurrentMatchCard`, `HeadToHeadCard`, `UserStatsCard`, `RecentMatchesCard`) and the
  `statInfo` / `headToHeadReplays` store fields it read are deleted. The general-stats card moved
  out to `components/OverallStatsCard/`, since both routes render it.
- `src/assets/characterIcons/getCharacterIcon.ts` is a 26-case switch that **falls back to
  Captain Falcon (id 0)**, so an unknown character id renders as Falcon instead of erroring.
- `electron/worker/replayParser.ts` swallows parse errors in a bare `try/catch`; anything that
  throws is filed as a bad replay.

## Known bugs

Pinned by a `// BUG` test so refactors stay honest. Fixing one means updating its test in the same
change — don't delete it.

None currently.
