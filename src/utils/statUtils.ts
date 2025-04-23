import {
  determineUserBasedOnLiveGame,
  executeCallbackOnEachReplay,
  Replay,
} from "@/db/replays";
import {
  BaseStat,
  CurrentReplayInfo,
  StatInfo,
  StatType,
  CharacterUsageStat,
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

  // statInfo.userInfo.characterUsage.forEach((characterUsageStat) => {
  //   const totalCount =
  //     statInfo.userStat.find((stat) => stat.type === "overall")?.totalCount ||
  //     0;
  //   characterUsageStat.playRate = totalCount
  //     ? Math.round((characterUsageStat.playCount / totalCount) * 100 * 10) / 10
  //     : 0;
  // });

  finalizeCharacterInfo(statInfo.userInfo.characterUsage);
  finalizeCharacterInfo(statInfo.opponentInfo.characterUsage);
  // statInfo.opponentInfo.characterUsage.forEach((characterUsageStat) => {
  //   const totalCount =
  //     statInfo.headToHeadStat.find((stat) => stat.type === "overall")
  //       ?.totalCount || 0;
  //   if (totalCount) {
  //     characterUsageStat.playRate =
  //       Math.round((characterUsageStat.playCount / totalCount) * 100 * 10) / 10;
  //   }
  // });

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
