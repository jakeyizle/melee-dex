import {
  determineUserBasedOnLiveGame,
  executeCallbackOnEachReplay,
  Replay,
  selectLatestReplay,
} from "@/db/replays";
import {
  BaseStat,
  CurrentReplayInfo,
  StatInfo,
  StatType,
  CharacterUsageStat,
  FullStats,
  Stat,
  MatchupAndStageStat,
  MatchupStat,
  StageStat,
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

export const getStatInfo = async ({
  currentReplayInfo,
}: {
  currentReplayInfo: CurrentReplayInfo;
}) => {
  const userConnectCode = await determineUserBasedOnLiveGame(
    currentReplayInfo.players.map((player) => player.connectCode),
  );
  const userCharacterId = currentReplayInfo.players.find(
    (player) => player.connectCode === userConnectCode,
  )?.characterId;

  const opponentConnectCode = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  )?.connectCode;
  const opponentCharacterId = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  )?.characterId;

  const stageId = currentReplayInfo.stageId;

  if (!userCharacterId || !opponentConnectCode || !opponentCharacterId) {
    return { statInfo: null, headToHeadReplays: [] };
  }

  const statInfo: StatInfo = {
    userInfo: {
      connectCode: userConnectCode,
      currentCharacterId: userCharacterId,
      characterUsage: [],
    },
    opponentInfo: {
      connectCode: opponentConnectCode,
      currentCharacterId: opponentCharacterId,
      characterUsage: [],
    },
    userStat: initalizeStats(),
    headToHeadStat: initalizeStats(),
  };
  const headToHeadReplays: Replay[] = [];

  const getStatsFromReplay = (replay: Replay) => {
    // only include stats if user is in the replay
    const replayUser = replay.players.find((player) => {
      return player.connectCode === userConnectCode;
    });
    if (!replayUser) return undefined;

    const replayOpponent = replay.players.find((player) => {
      return player.connectCode === opponentConnectCode;
    });
    if (replayOpponent) {
      updateCharacterInfo({
        characterUsage: statInfo.userInfo.characterUsage,
        replayCharacterId: replayUser.characterId,
      });

      updateCharacterInfo({
        characterUsage: statInfo.opponentInfo.characterUsage,
        replayCharacterId: replayOpponent.characterId,
      });

      headToHeadReplays.push(replay);
    }

    if (replayUser.characterId !== userCharacterId) return undefined;

    const isWin = replay.winnerConnectCode === userConnectCode;
    const isStage = replay.stageId == stageId;
    // any opponent is playing the current opponent character
    const isCurrentMatchUp = replay.players.some((player) => {
      return (
        player.connectCode !== userConnectCode &&
        player.characterId == opponentCharacterId
      );
    });
    statInfo.userStat.forEach((stat) =>
      updateStat({ stat, isWin, isStage, isCurrentMatchUp }),
    );

    if (replayOpponent)
      statInfo.headToHeadStat.forEach((stat) =>
        updateStat({ stat, isWin, isStage, isCurrentMatchUp }),
      );
  };
  await executeCallbackOnEachReplay((replay) => getStatsFromReplay(replay));

  finalizeCharacterInfo(statInfo.userInfo.characterUsage);
  finalizeCharacterInfo(statInfo.opponentInfo.characterUsage);

  return { statInfo, headToHeadReplays };
};

const initalizeStat = (type: StatType): BaseStat => {
  return {
    type,
    totalCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
  };
};

const initalizeStats = (): BaseStat[] => {
  return [
    initalizeStat("overall"),
    initalizeStat("stage"),
    initalizeStat("currentMatchUp"),
    initalizeStat("currentMatchUpAndStage"),
  ];
};

const updateStat = ({
  stat,
  isWin,
  isStage,
  isCurrentMatchUp,
}: {
  stat: BaseStat;
  isWin: boolean;
  isStage: boolean;
  isCurrentMatchUp: boolean;
}) => {
  switch (stat.type) {
    case "overall":
      break;
    case "stage":
      if (!isStage) return;
      break;
    case "currentMatchUp":
      if (!isCurrentMatchUp) return;
      break;
    case "currentMatchUpAndStage":
      if (!isStage || !isCurrentMatchUp) return;
  }

  stat.totalCount += 1;
  stat.winCount += isWin ? 1 : 0;
  stat.lossCount += isWin ? 0 : 1;
  stat.winRate = Math.round((stat.winCount / stat.totalCount) * 100 * 10) / 10;
};

const updateCharacterInfo = ({
  characterUsage,
  replayCharacterId,
}: {
  characterUsage: CharacterUsageStat[];
  replayCharacterId: string;
}) => {
  const characterUsageStat = characterUsage.find(
    (characterUsageStat) =>
      characterUsageStat.characterId === replayCharacterId,
  );
  if (characterUsageStat) characterUsageStat.playCount += 1;
  else
    characterUsage.push({
      characterId: replayCharacterId,
      playCount: 1,
      playRate: 0,
    });
};

const finalizeCharacterInfo = (characterUsage: CharacterUsageStat[]) => {
  const totalCount = characterUsage.reduce(
    (total, characterUsageStat) => total + characterUsageStat.playCount,
    0,
  );
  characterUsage.forEach((characterUsageStat) => {
    characterUsageStat.playRate =
      Math.round((characterUsageStat.playCount / totalCount) * 100 * 10) / 10;
  });

  return characterUsage.sort((a, b) => b.playCount - a.playCount).slice(0, 5);
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
