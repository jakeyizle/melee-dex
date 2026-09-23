import {
  executeCallbackOnEachReplay,
  Replay,
  ReplayMode,
  selectReplay,
} from "@/db/replays";
import {
  FullStats,
  Stat,
  Stats,
  CurrentReplayInfo,
  CharacterUsageStat,
  OpponentStats,
} from "@/types";

const createEmptyStat = (): Stat => ({
  totalCount: 0,
  winCount: 0,
  lossCount: 0,
  winRate: 0,
  totalFrames: 0,
});

const createEmptyStats = (): Stats => ({
  overallStat: createEmptyStat(),
  modeStats: [],
  stageStats: [],
  matchupStats: [],
  matchupAndStageStats: [],
});

export const createEmptyFullStats = (): FullStats => ({
  stats: createEmptyStats(),
  opponentSpecificStats: [],
  opponentIndex: new Map(),
});

// ---------------------------------------------------------------------------
// Counting a game
// ---------------------------------------------------------------------------

const countGame = (stat: Stat, isWin: boolean, frames: number) => {
  stat.totalCount += 1;
  stat.winCount += isWin ? 1 : 0;
  stat.lossCount += isWin ? 0 : 1;
  stat.winRate = Math.round((stat.winCount / stat.totalCount) * 100 * 10) / 10;
  stat.totalFrames += frames;
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
  frames: number,
) => {
  let row = rows.find(matches);
  if (!row) {
    row = createRow();
    rows.push(row);
  }
  countGame(row, isWin, frames);
};

/** What a single game is bucketed by. */
type GameKeys = {
  userCharacterId: string;
  opponentCharacterId: string;
  stageId: string;
  mode: ReplayMode;
  /** Length of the game in frames; 0 for replays stored before it was recorded. */
  frames: number;
};

/** Counts one game into every bucket of a `Stats`. */
const countGameInStats = (stats: Stats, keys: GameKeys, isWin: boolean) => {
  const { userCharacterId, opponentCharacterId, stageId, mode, frames } = keys;

  countGame(stats.overallStat, isWin, frames);

  countGameInRow(
    stats.modeStats,
    (row) => row.mode === mode,
    () => ({ ...createEmptyStat(), mode }),
    isWin,
    frames,
  );

  countGameInRow(
    stats.stageStats,
    (row) => row.stageId === stageId,
    () => ({ ...createEmptyStat(), stageId }),
    isWin,
    frames,
  );

  countGameInRow(
    stats.matchupStats,
    (row) =>
      row.userCharacterId === userCharacterId &&
      row.opponentCharacterId === opponentCharacterId,
    () => ({ ...createEmptyStat(), userCharacterId, opponentCharacterId }),
    isWin,
    frames,
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
    frames,
  );
};

/**
 * Names are how the user recognises someone, and they change — so the set is
 * kept rather than the latest. A replay with no display name adds nothing:
 * older replays often have none, and a blank would read as a real alias.
 */
const rememberName = (opponentStats: OpponentStats, name: string) => {
  if (!name || opponentStats.knownNames.includes(name)) return;
  opponentStats.knownNames.push(name);
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
 */
export const applyReplayToStats = (
  fullStats: FullStats,
  replay: Replay | null,
  userConnectCode: string,
): FullStats => {
  const user = replay?.players.find((p) => p.connectCode === userConnectCode);
  const opponent = replay?.players.find(
    (p) => p.connectCode !== userConnectCode,
  );
  if (!replay || !user || !opponent) return fullStats;

  const keys: GameKeys = {
    userCharacterId: user.characterId,
    opponentCharacterId: opponent.characterId,
    stageId: replay.stageId,
    // Replays stored before `mode` existed have none. Unranked is both the
    // overwhelming majority and what a replay with no matchId classifies as.
    mode: replay.mode ?? "unranked",
    frames: replay.lastFrame ?? 0,
  };
  const isWin = replay.winnerConnectCode === userConnectCode;

  countGameInStats(fullStats.stats, keys, isWin);

  let opponentStats = fullStats.opponentIndex.get(opponent.connectCode);
  if (!opponentStats) {
    opponentStats = {
      ...createEmptyStats(),
      opponentConnectCode: opponent.connectCode,
      firstMatchDate: replay.date,
      lastMatchDate: replay.date,
      knownNames: [],
    };
    // Pushed and indexed together, and never apart: the two hold the same
    // object, and the index is what every lookup goes through.
    fullStats.opponentSpecificStats.push(opponentStats);
    fullStats.opponentIndex.set(opponent.connectCode, opponentStats);
  }

  countGameInStats(opponentStats, keys, isWin);
  widenMatchDates(opponentStats, replay.date);
  rememberName(opponentStats, opponent.name);

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

/**
 * The record in one mode. Returns a zeroed `Stat` rather than undefined, so the
 * breakdown renders "0 (0 - 0)" from the very first launch instead of blanking.
 */
export const getModeStat = (stats: Stats, mode: ReplayMode): Stat =>
  stats.modeStats.find((row) => row.mode === mode) ?? createEmptyStat();

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

  const opponentStats = fullStats.opponentIndex.get(opponent.connectCode);
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
