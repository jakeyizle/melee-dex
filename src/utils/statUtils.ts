import {
  executeCallbackOnEachReplay,
  Replay,
  selectLatestReplay,
} from "@/db/replays";
import {
  FullStats,
  Stat,
  MatchupAndStageStat,
  MatchupStat,
  StageStat,
  CurrentReplayInfo,
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

export const getStats = async (userConnectCode: string): Promise<FullStats> => {
  const fullStats: FullStats = {
    stats: {
      overallStat: {
        totalCount: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
      },
      stageStats: [],
      matchupStats: [],
      matchupAndStageStats: [],
    },
    opponentSpecificStats: [],
  };
  await executeCallbackOnEachReplay((replay) =>
    getStatsFromReplay(replay, userConnectCode, fullStats),
  );

  return fullStats;
};

const getStatsFromReplay = (
  replay: Replay,
  userConnectCode: string,
  fullStats: FullStats,
) => {
  const user = replay.players?.find((p) => p.connectCode === userConnectCode);
  const opponent = replay.players?.find(
    (p) => p.connectCode !== userConnectCode,
  );
  if (!user || !opponent) return;

  const { characterId: userCharacterId } = user;
  const { characterId: opponentCharacterId, connectCode: opponentConnectCode } =
    opponent;
  const stageId = replay.stageId;
  const isWin = replay.winnerConnectCode === userConnectCode;

  updateOverallStat(fullStats.stats.overallStat, isWin);
  updateStageStat(fullStats.stats.stageStats, stageId, isWin);
  updateMatchupStat(
    fullStats.stats.matchupStats,
    userCharacterId,
    opponentCharacterId,
    isWin,
  );
  updateMatchupAndStageStat(
    fullStats.stats.matchupAndStageStats,
    userCharacterId,
    opponentCharacterId,
    stageId,
    isWin,
  );

  let opponentStat = fullStats.opponentSpecificStats.find(
    (opponentSpecificStat) =>
      opponentSpecificStat.opponentConnectCode === opponentConnectCode,
  );

  if (!opponentStat) {
    opponentStat = {
      opponentConnectCode,
      overallStat: {
        totalCount: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
      },
      stageStats: [],
      matchupStats: [],
      matchupAndStageStats: [],
    };

    fullStats.opponentSpecificStats.push(opponentStat);
  }

  updateOverallStat(opponentStat.overallStat, isWin);
  updateStageStat(opponentStat.stageStats, stageId, isWin);
  updateMatchupStat(
    opponentStat.matchupStats,
    userCharacterId,
    opponentCharacterId,
    isWin,
  );
  updateMatchupAndStageStat(
    opponentStat.matchupAndStageStats,
    userCharacterId,
    opponentCharacterId,
    stageId,
    isWin,
  );
};

const incrementStat = (stat: Stat, isWin: boolean) => {
  stat.totalCount += 1;
  stat.winCount += isWin ? 1 : 0;
  stat.lossCount += isWin ? 0 : 1;
  stat.winRate = Math.round((stat.winCount / stat.totalCount) * 100 * 10) / 10;
};

const updateOverallStat = (stat: Stat, isWin: boolean) => {
  incrementStat(stat, isWin);
};

const updateStageStat = (
  stageStats: StageStat[],
  stageId: string,
  isWin: boolean,
) => {
  const doesStageStatExist = stageStats.some(
    (stageStat) => stageStat.stageId === stageId,
  );
  if (!doesStageStatExist) {
    stageStats.push({
      stageId,
      totalCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
    });
  }

  stageStats.forEach((stageStat) => {
    if (stageStat.stageId === stageId) {
      incrementStat(stageStat, isWin);
      return;
    }
  });
};

const updateMatchupStat = (
  matchupStats: MatchupStat[],
  userCharacterId: string,
  opponentCharacterId: string,
  isWin: boolean,
) => {
  const doesMatchupStatExist = matchupStats.some((matchupStat) => {
    return (
      matchupStat.userCharacterId === userCharacterId &&
      matchupStat.opponentCharacterId === opponentCharacterId
    );
  });
  if (!doesMatchupStatExist) {
    matchupStats.push({
      userCharacterId,
      opponentCharacterId,
      totalCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
    });
  }
  matchupStats.forEach((matchupStat) => {
    if (
      matchupStat.userCharacterId === userCharacterId &&
      matchupStat.opponentCharacterId === opponentCharacterId
    ) {
      incrementStat(matchupStat, isWin);
      return;
    }
  });
};

const updateMatchupAndStageStat = (
  matchupAndStageStats: MatchupAndStageStat[],
  userCharacterId: string,
  opponentCharacterId: string,
  stageId: string,
  isWin: boolean,
) => {
  const doesMatchupAndStageStatExist = matchupAndStageStats.some(
    (matchupAndStageStat) => {
      return (
        matchupAndStageStat.userCharacterId === userCharacterId &&
        matchupAndStageStat.opponentCharacterId === opponentCharacterId &&
        matchupAndStageStat.stageId === stageId
      );
    },
  );

  if (!doesMatchupAndStageStatExist) {
    matchupAndStageStats.push({
      userCharacterId,
      opponentCharacterId,
      stageId,
      totalCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
    });
  }
  matchupAndStageStats.forEach((matchupAndStageStat) => {
    if (
      matchupAndStageStat.userCharacterId === userCharacterId &&
      matchupAndStageStat.opponentCharacterId === opponentCharacterId &&
      matchupAndStageStat.stageId === stageId
    ) {
      incrementStat(matchupAndStageStat, isWin);
      return;
    }
  });
};

export const updateStatsWithReplay = async (
  fullStats: FullStats,
  userConnectCode: string,
) => {
  const replay = await selectLatestReplay();
  if (
    !replay ||
    !replay.players.some((player) => player.connectCode === userConnectCode)
  )
    return;
  getStatsFromReplay(replay, userConnectCode, fullStats);
  return fullStats;
};

export const getCurrentHeadToHeadStats = (
  fullStats: FullStats,
  currentReplayInfo: CurrentReplayInfo,
  userConnectCode: string,
) => {
  const player = currentReplayInfo.players.find(
    (player) => player.connectCode === userConnectCode,
  );
  const opponent = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  );

  if (!player || !opponent) return null;

  const opponentStats = fullStats.opponentSpecificStats.find((opponentStat) => {
    return opponentStat.opponentConnectCode === opponent.connectCode;
  });
  if (!opponentStats) return null;

  const stageId = currentReplayInfo.stageId;

  const opponentStageStat = opponentStats.stageStats.find((stageStat) => {
    return stageStat.stageId === stageId;
  });

  const opponentMatchupStats = opponentStats.matchupStats.find(
    (matchupStat) => {
      return (
        matchupStat.userCharacterId === player.characterId &&
        matchupStat.opponentCharacterId === opponent.characterId
      );
    },
  );

  const opponentMatchupStageStats = opponentStats.matchupAndStageStats.find(
    (matchupAndStageStat) => {
      return (
        matchupAndStageStat.userCharacterId === player.characterId &&
        matchupAndStageStat.opponentCharacterId === opponent.characterId &&
        matchupAndStageStat.stageId === stageId
      );
    },
  );

  return {
    overallStat: opponentStats.overallStat,
    stageStat: opponentStageStat,
    matchupStat: opponentMatchupStats,
    matchupAndStageStat: opponentMatchupStageStats,
  };
};
