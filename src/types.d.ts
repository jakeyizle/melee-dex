import { Character } from "@slippi/slippi-js";

export type LiveReplayPlayers = {
  connectCode: string;
  name: string;
  characterId: string;
};

export type CurrentReplayInfo = {
  players: LiveReplayPlayers[];
  stageId: string;
};

export type PlayerCharacter = {
  connectCode: string;
  characterId: string;
};

export type CharacterUsageStat = {
  characterId: string;
  playCount: number;
  playRate: number;
};

export type PlayerInfo = {
  connectCode: string;
  currentCharacterId: string;
  characterUsage: CharacterUsageStat[];
};

export type StatType =
  | "overall"
  | "stage"
  | "currentMatchUp"
  | "currentMatchUpAndStage";

export type BaseStat = {
  type: StatType;
  totalCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
};

export type StatInfo = {
  userInfo: PlayerInfo;
  opponentInfo: PlayerInfo;
  userStat: BaseStat[];
  headToHeadStat: BaseStat[];
};

export type Stat = {
  totalCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
};

export type StageStat = Stat & {
  stageId: string;
};

export type MatchupStat = Stat & {
  userCharacterId: string;
  opponentCharacterId: string;
};

export type MatchupAndStageStat = StageStat & MatchupStat;

export type Stats = {
  overallStat: Stat;
  stageStats: StageStat[];
  matchupStats: MatchupStat[];
  matchupAndStageStats: MatchupAndStageStat[];
};

export type OpponentStats = Stats & {
  opponentConnectCode: string;
  firstMatchDate: string;
  lastMatchDate: string;
};

export type FullStats = {
  stats: Stats;
  opponentSpecificStats: OpponentStats[];
};

export type HeadToHeadStats = {
  opponentStats: OpponentStats;
  userCharacterUsages?: CharacterUsageStat[];
  opponentCharacterUsages?: CharacterUsageStat[];
};
