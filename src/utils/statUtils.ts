import { executeCallbackOnEachReplay, Replay, selectReplay } from "@/db/replays";
import {
  FullStats,
  Stat,
  Stats,
  CurrentReplayInfo,
  CharacterUsageStat,
  OpponentStats,
} from "@/types";

export const getMostRecentMatches = (
  replays: Replay[],
  numberOfReplays: number,
) => {
  const sortedReplays = replays.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return sortedReplays.slice(0, numberOfReplays);
};

const createEmptyStat = (): Stat => ({
  totalCount: 0,
  winCount: 0,
  lossCount: 0,
  winRate: 0,
});

const createEmptyStats = (): Stats => ({
  overallStat: createEmptyStat(),
  stageStats: [],
  matchupStats: [],
  matchupAndStageStats: [],
});

export const createEmptyFullStats = (): FullStats => ({
  stats: createEmptyStats(),
  opponentSpecificStats: [],
});

// ---------------------------------------------------------------------------
// Counting a game
// ---------------------------------------------------------------------------

const countGame = (stat: Stat, isWin: boolean) => {
  stat.totalCount += 1;
  stat.winCount += isWin ? 1 : 0;
  stat.lossCount += isWin ? 0 : 1;
  stat.winRate = Math.round((stat.winCount / stat.totalCount) * 100 * 10) / 10;
};

/**
 * Counts the game into the row `matches` picks out, adding a zeroed row first
 * if this is the first game for it. Every bucket below is this same upsert
 * under a different key.
 */
const countGameInRow = <T extends Stat>(
  rows: T[],
  matches: (row: T) => boolean,
  createRow: () => T,
  isWin: boolean,
) => {
  let row = rows.find(matches);
  if (!row) {
    row = createRow();
    rows.push(row);
  }
  countGame(row, isWin);
};

/** What a single game is bucketed by. */
type GameKeys = {
  userCharacterId: string;
  opponentCharacterId: string;
  stageId: string;
};

/** Counts one game into all four buckets of a `Stats`. */
const countGameInStats = (stats: Stats, keys: GameKeys, isWin: boolean) => {
  const { userCharacterId, opponentCharacterId, stageId } = keys;

  countGame(stats.overallStat, isWin);

  countGameInRow(
    stats.stageStats,
    (row) => row.stageId === stageId,
    () => ({ ...createEmptyStat(), stageId }),
    isWin,
  );

  countGameInRow(
    stats.matchupStats,
    (row) =>
      row.userCharacterId === userCharacterId &&
      row.opponentCharacterId === opponentCharacterId,
    () => ({ ...createEmptyStat(), userCharacterId, opponentCharacterId }),
    isWin,
  );

  countGameInRow(
    stats.matchupAndStageStats,
    (row) =>
      row.userCharacterId === userCharacterId &&
      row.opponentCharacterId === opponentCharacterId &&
      row.stageId === stageId,
    () => ({
      ...createEmptyStat(),
      userCharacterId,
      opponentCharacterId,
      stageId,
    }),
    isWin,
  );
};

const widenMatchDates = (opponentStats: OpponentStats, date: string) => {
  const replayTime = new Date(date).getTime();
  if (replayTime < new Date(opponentStats.firstMatchDate).getTime()) {
    opponentStats.firstMatchDate = date;
  }
  if (replayTime > new Date(opponentStats.lastMatchDate).getTime()) {
    opponentStats.lastMatchDate = date;
  }
};

/**
 * **The shared core.** Folds one replay into a `FullStats` by mutating it in
 * place, counting it into the global buckets and into this opponent's record
 * together. Every path in this module ends up here, so this is what to edit to
 * change how a replay is counted.
 *
 * Returns `fullStats` whether or not the replay counted — a replay the user did
 * not play in is skipped. The store writes the result straight back into
 * `newStatInfo`, so returning nothing here would blank the dashboard.
 *
 * `replay.players?.` rather than `replay.players.` is deliberate: iterating the
 * replay store also yields the latest-replay pointer's string value. See
 * "Known behavior quirks" #4 in src/CLAUDE.md.
 */
export const applyReplayToStats = (
  fullStats: FullStats,
  replay: Replay | null,
  userConnectCode: string,
): FullStats => {
  const user = replay?.players?.find((p) => p.connectCode === userConnectCode);
  const opponent = replay?.players?.find(
    (p) => p.connectCode !== userConnectCode,
  );
  if (!replay || !user || !opponent) return fullStats;

  const keys: GameKeys = {
    userCharacterId: user.characterId,
    opponentCharacterId: opponent.characterId,
    stageId: replay.stageId,
  };
  const isWin = replay.winnerConnectCode === userConnectCode;

  countGameInStats(fullStats.stats, keys, isWin);

  let opponentStats = fullStats.opponentSpecificStats.find(
    (candidate) => candidate.opponentConnectCode === opponent.connectCode,
  );
  if (!opponentStats) {
    opponentStats = {
      ...createEmptyStats(),
      opponentConnectCode: opponent.connectCode,
      firstMatchDate: replay.date,
      lastMatchDate: replay.date,
    };
    fullStats.opponentSpecificStats.push(opponentStats);
  }

  countGameInStats(opponentStats, keys, isWin);
  widenMatchDates(opponentStats, replay.date);

  return fullStats;
};

// ---------------------------------------------------------------------------
// The ways stats get built
// ---------------------------------------------------------------------------

/**
 * Pure fold over a collection of replays. `getStats` streams out of IndexedDB
 * instead of calling this, to avoid materializing an entire replay library.
 */
export const buildStats = (
  replays: Iterable<Replay>,
  userConnectCode: string,
): FullStats => {
  const fullStats = createEmptyFullStats();
  for (const replay of replays) {
    applyReplayToStats(fullStats, replay, userConnectCode);
  }
  return fullStats;
};

/**
 * The batch path, run once on `end-loading-replays`. Streams every stored
 * replay rather than materializing the library into an array.
 */
export const getStats = async (userConnectCode: string): Promise<FullStats> => {
  const fullStats = createEmptyFullStats();
  await executeCallbackOnEachReplay((replay) => {
    applyReplayToStats(fullStats, replay, userConnectCode);
  });
  return fullStats;
};

/**
 * The live path. Folds the replay main just finished loading into the running
 * stats, looked up by the name main reports rather than through the
 * latest-replay pointer: a rejected live game stores nothing, and the pointer
 * would hand back the *previous* replay to be counted a second time.
 */
export const updateStatsWithReplay = async (
  fullStats: FullStats,
  userConnectCode: string,
  replayName: string,
) => {
  const replay = await selectReplay(replayName);
  return applyReplayToStats(fullStats, replay, userConnectCode);
};

// ---------------------------------------------------------------------------
// Derived, pure
// ---------------------------------------------------------------------------

const toCharacterUsages = (
  playCounts: Map<string, number>,
  gamesPlayed: number,
): CharacterUsageStat[] =>
  Array.from(playCounts, ([characterId, playCount]) => ({
    characterId,
    playCount,
    playRate: (playCount / gamesPlayed) * 100,
  }));

/** Narrows a `FullStats` to the single-opponent view the dashboard renders. */
export const getCurrentHeadToHeadStats = (
  fullStats: FullStats,
  currentReplayInfo: CurrentReplayInfo,
  userConnectCode: string,
) => {
  const player = currentReplayInfo.players.find(
    (candidate) => candidate.connectCode === userConnectCode,
  );
  const opponent = currentReplayInfo.players.find(
    (candidate) => candidate.connectCode !== userConnectCode,
  );
  if (!player || !opponent) return null;

  const opponentStats = fullStats.opponentSpecificStats.find(
    (candidate) => candidate.opponentConnectCode === opponent.connectCode,
  );
  if (!opponentStats) return null;

  // One pass over the matchup rows, totalling each side's characters. The
  // previous version re-filtered and re-reduced the whole array once per row.
  const userPlayCounts = new Map<string, number>();
  const opponentPlayCounts = new Map<string, number>();
  for (const matchup of opponentStats.matchupStats) {
    userPlayCounts.set(
      matchup.userCharacterId,
      (userPlayCounts.get(matchup.userCharacterId) ?? 0) + matchup.totalCount,
    );
    opponentPlayCounts.set(
      matchup.opponentCharacterId,
      (opponentPlayCounts.get(matchup.opponentCharacterId) ?? 0) +
        matchup.totalCount,
    );
  }

  const gamesPlayed = opponentStats.overallStat.totalCount;
  return {
    opponentStats,
    userCharacterUsages: toCharacterUsages(userPlayCounts, gamesPlayed),
    opponentCharacterUsages: toCharacterUsages(opponentPlayCounts, gamesPlayed),
  };
};

// TODO: narrow the head-to-head view to the current matchup / stage /
// matchup-and-stage, reading opponentStats.stageStats, .matchupStats and
// .matchupAndStageStats keyed on currentReplayInfo.
