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
  winCount: number;
  lossCount: number;
  playRate: number;
};

export type HeadToHeadStat = {
  connectCode: string;
  overallWinCount: number;
  overallLossCount: number;
  overallWinRate: number;
  currentMatchUpGameCount: number;
  currentMatchUpWinCount: number;
  currentMatchUpLossCount: number;
  currentMatchUpWinRate: number;
  characterUsage: CharacterUsageStat[];
  currentCharacterId: string;
};

export type UserStat = {
  userConnectCode: string;

  overallWinCount: number;
  overallLossCount: number;
  overallWinRate: number;

  stageWinCount: number;
  stageLossCount: number;
  stageWinRate: number;
  stageGameCount: number;

  currentMatchUpGameCount: number;
  currentMatchUpWinCount: number;
  currentMatchUpLossCount: number;
  currentMatchUpWinRate: number;

  currentMatchUpAndStageGameCount: number;
  currentMatchUpAndStageWinCount: number;
  currentMatchUpAndStageLossCount: number;
  currentMatchUpAndStageWinRate: number;
};
