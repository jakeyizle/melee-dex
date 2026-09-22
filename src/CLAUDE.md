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

## Stats

All aggregation lives in `src/utils/statUtils.ts`. Everything funnels through one core:

- `getStatsFromReplay(replay, code, fullStats)` — **the shared core.** Folds a single replay into
  a `FullStats` by mutating it in place, updating the overall / stage / matchup / matchup-and-stage
  buckets and the per-opponent record together. Every path below ends up here, so this is what you
  edit to change how a replay is counted. It returns early when the replay has no user/opponent
  pair, which is how replays the user did not play in are skipped.

The batch path, run once on `end-loading-replays`:

- `getStats(code)` — the DB adapter. **Streams** via `executeCallbackOnEachReplay` straight into
  `getStatsFromReplay`, so a large replay library is never materialized into an array. It
  deliberately does **not** call `buildStats`. Keep it that way.
- `buildStats(replays, code)` — pure fold over any iterable of replays. **Used only by the unit
  tests**, which need to build a `FullStats` synchronously without IndexedDB; production always
  goes through `getStats`.

The live path, run on `update-stats` when a game finishes:

- `updateStatsWithReplay(stats, code)` — the DB adapter; reads the latest replay and delegates.
- `applyReplayToStats(stats, replay, code)` — guards against a null replay and against replays the
  user is not in, then delegates to the core. Mutates `stats` in place and returns it (returns
  `undefined` when it declines).

Derived, pure:

- `getCurrentHeadToHeadStats(stats, currentReplayInfo, code)` — narrows a `FullStats` to the
  single-opponent view the dashboard renders.
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
- `replayStore.ts` still has two leftover `console.log` calls in its IPC handlers.

## Known behavior quirks

These are bugs. The unit suite **asserts them as-is** so that refactors stay honest; each has a
`// BUG` comment at the test. If you fix one, update its test in the same change — don't delete it.

1. `getCurrentHeadToHeadStats` — opponent character play rate uses `+=` where the user branch
   uses `=`, so a character appearing in several matchup rows accumulates and can exceed 100%.
2. `getMostRecentMatches` — sorts the caller's array in place, reordering it as a side effect.
3. `selectReplayCount` — counts the `latestReplayKey` pointer, so it is always one too high.
4. `executeCallbackOnEachReplay` — yields that pointer's **string** value as if it were a
   `Replay`; this is why the stat code uses `replay.players?.` rather than `replay.players.`.
5. `getMostCommonUser([])` against an empty store returns `undefined` (`Math.max(...[])` is
   `-Infinity`, which matches no key) despite being typed `Promise<string>`.
6. `getMostCommonUser` returns the **second** candidate on a tie, though the comment in
   `determineUserBasedOnLiveGame` says "if tied, return first player".
7. `tryGetWinner` — equal stock counts yield no winner, so the replay is filed as bad and never
   counted.
8. `isReplayValid` — **throws** on a one-player replay instead of returning `false`, because it
   reads `players[1]` after the length check already failed. The worker's `try/catch` turns this
   into a bad-replay record, so the outcome matches the intent by accident.
