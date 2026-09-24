import type { ReplayMode } from "@/db/replays";

export type LiveReplayPlayers = {
  connectCode: string;
  name: string;
  characterId: string;
};

export type CurrentReplayInfo = {
  players: LiveReplayPlayers[];
  stageId: string;
};

export type CharacterUsageStat = {
  characterId: string;
  playCount: number;
  playRate: number;
};

export type Stat = {
  totalCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  /**
   * Frames of game time counted into this bucket, at 60fps. Replays stored
   * before `lastFrame` existed contribute nothing, so a library that predates
   * it reads as zero rather than as a wrong number.
   */
  totalFrames: number;
};

export type StageStat = Stat & {
  stageId: string;
};

/** The ranked/unranked split. `overallStat` is the two of these combined. */
export type ModeStat = Stat & {
  mode: ReplayMode;
};

export type MatchupStat = Stat & {
  userCharacterId: string;
  opponentCharacterId: string;
};

export type MatchupAndStageStat = StageStat & MatchupStat;

export type Stats = {
  overallStat: Stat;
  modeStats: ModeStat[];
  stageStats: StageStat[];
  matchupStats: MatchupStat[];
  matchupAndStageStats: MatchupAndStageStat[];
};

export type OpponentStats = Stats & {
  opponentConnectCode: string;
  firstMatchDate: string;
  lastMatchDate: string;
  /**
   * Every display name this connect code has played under, in the order first
   * seen. The connect code is the identity; the name is what the user actually
   * remembers them by, and it changes.
   */
  knownNames: string[];
};

export type FullStats = {
  stats: Stats;
  opponentSpecificStats: OpponentStats[];
  /**
   * `opponentSpecificStats` keyed by connect code — the *same* objects, not
   * copies, so writing through either is writing through both.
   *
   * Finding the opponent row was a linear scan of the array, once per replay,
   * which made building the stats O(replays x opponents): measured at 5.0us per
   * replay over 500 opponents, 14us over 3,000 and 43.8us over 10,000, where it
   * had become 2.6x the cost of the IndexedDB scan feeding it. The array stays
   * because the UI iterates and sorts it.
   */
  opponentIndex: Map<string, OpponentStats>;
};

export type HeadToHeadStats = {
  opponentStats: OpponentStats;
  userCharacterUsages?: CharacterUsageStat[];
  opponentCharacterUsages?: CharacterUsageStat[];
};

/**
 * A player's current ranked standing, fetched from slippi.gg rather than read
 * from the replay — the `.slp` format carries no rank at all, only which queue
 * the game was in. Current only: what either player was ranked at the time of a
 * stored replay does not exist anywhere, so this can never be backfilled.
 */
export type RankProfile = {
  connectCode: string;
  ratingOrdinal: number;
  /** Ranked sets counted so far. Under five, the tier is still `Pending`. */
  ratingUpdateCount: number;
  wins: number;
  losses: number;
  dailyGlobalPlacement: number | null;
  /** Derived, not fetched. See `src/utils/rankUtils.ts`. */
  tier: string;
};
