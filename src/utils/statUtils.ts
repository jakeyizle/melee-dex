import {
  determineUserBasedOnLiveGame,
  Replay,
  selectUserAndHeadToHeadReplays,
} from "@/db/replays";
import {
  CurrentReplayInfo,
  HeadToHeadStat,
  PlayerCharacter,
  UserStat,
} from "@/types";

export const getHeadToHeadStats = (
  replays: Replay[],
  playerCharacters: PlayerCharacter[],
  stageId: string,
): HeadToHeadStat[] => {
  const playerStats: HeadToHeadStat[] = playerCharacters.map(
    (playerCharacter) => {
      return {
        connectCode: playerCharacter.connectCode,
        overallWinCount: 0,
        overallLossCount: 0,
        overallWinRate: 0,
        currentMatchUpGameCount: 0,
        currentMatchUpWinCount: 0,
        currentMatchUpLossCount: 0,
        currentMatchUpWinRate: 0,
        stageGameCount: 0,
        stageWinCount: 0,
        stageLossCount: 0,
        stageWinRate: 0,
        currentMatchUpAndStageGameCount: 0,
        currentMatchUpAndStageWinCount: 0,
        currentMatchUpAndStageLossCount: 0,
        currentMatchUpAndStageWinRate: 0,
        characterUsage: [],
        currentCharacterId: playerCharacter.characterId,
      };
    },
  );
  replays.forEach((replay) => {
    const isCurrentMatchUp = playerCharacters.every((playerCharacter) => {
      return replay.players.some(
        (player) =>
          player.connectCode === playerCharacter.connectCode &&
          player.characterId === playerCharacter.characterId,
      );
    });
    const isStage = replay.stageId == stageId;

    playerStats.forEach((playerStat) => {
      const player = replay.players.find(
        (player) => player.connectCode === playerStat.connectCode,
      );
      if (!player) return;

      const isWin = player.connectCode === replay.winnerConnectCode;
      playerStat.overallWinCount += isWin ? 1 : 0;
      playerStat.overallLossCount += !isWin ? 1 : 0;
      playerStat.currentMatchUpGameCount += isCurrentMatchUp ? 1 : 0;
      playerStat.currentMatchUpWinCount += isWin && isCurrentMatchUp ? 1 : 0;
      playerStat.currentMatchUpLossCount += !isWin && isCurrentMatchUp ? 1 : 0;
      playerStat.stageGameCount += isStage ? 1 : 0;
      playerStat.stageWinCount += isWin && isStage ? 1 : 0;
      playerStat.stageLossCount += !isWin && isStage ? 1 : 0;
      playerStat.currentMatchUpAndStageGameCount +=
        isCurrentMatchUp && isStage ? 1 : 0;
      playerStat.currentMatchUpAndStageWinCount +=
        isWin && isCurrentMatchUp && isStage ? 1 : 0;
      playerStat.currentMatchUpAndStageLossCount +=
        !isWin && isCurrentMatchUp && isStage ? 1 : 0;
      const characterUsage = playerStat.characterUsage.find(
        (characterUsage) => characterUsage.characterId === player.characterId,
      );
      if (!characterUsage) {
        playerStat.characterUsage.push({
          characterId: player.characterId,
          playCount: 1,
          winCount: isWin ? 1 : 0,
          lossCount: !isWin ? 1 : 0,
          playRate: 0,
        });
      } else {
        characterUsage.playCount += 1;
        characterUsage.winCount += isWin ? 1 : 0;
        characterUsage.lossCount += !isWin ? 1 : 0;
      }
    });
  });

  playerStats.forEach((playerStat) => {
    playerStat.overallWinRate =
      Math.round((playerStat.overallWinCount / replays.length) * 100 * 10) / 10;

    playerStat.currentMatchUpWinRate =
      Math.round(
        (playerStat.currentMatchUpWinCount /
          playerStat.currentMatchUpGameCount) *
          100 *
          10,
      ) / 10;

    playerStat.stageWinRate =
      Math.round(
        (playerStat.stageWinCount / playerStat.stageGameCount) * 100 * 10,
      ) / 10;

    playerStat.currentMatchUpAndStageWinRate =
      Math.round(
        (playerStat.currentMatchUpAndStageWinCount /
          playerStat.currentMatchUpAndStageGameCount) *
          100 *
          10,
      ) / 10;

    // sort character usage by play count and keep only top 3
    playerStat.characterUsage.sort((a, b) => b.playCount - a.playCount);
    playerStat.characterUsage = playerStat.characterUsage.slice(0, 3);
    // for testing - repeat character usage for testing
    // for (let i = 0; i < 3; i++) {
    //   playerStat.characterUsage[i] = playerStat.characterUsage[0];
    // }

    playerStat.characterUsage.forEach((characterUsage) => {
      characterUsage.playRate =
        Math.round((characterUsage.playCount / replays.length) * 100 * 10) / 10;
    });
  });

  return playerStats;
};

export const getUserStat = (
  replays: Replay[],
  playerCharacters: PlayerCharacter[] | undefined,
  stageId: string,
  userConnectCode: string,
) => {
  const userStat: UserStat = {
    userConnectCode,
    overallWinCount: 0,
    overallLossCount: 0,
    overallWinRate: 0,
    stageWinCount: 0,
    stageLossCount: 0,
    stageWinRate: 0,
    stageGameCount: 0,
    currentMatchUpGameCount: 0,
    currentMatchUpWinCount: 0,
    currentMatchUpLossCount: 0,
    currentMatchUpWinRate: 0,
    currentMatchUpAndStageGameCount: 0,
    currentMatchUpAndStageWinCount: 0,
    currentMatchUpAndStageLossCount: 0,
    currentMatchUpAndStageWinRate: 0,
  };
  if (!playerCharacters || !stageId || !userConnectCode || replays.length === 0)
    return userStat;

  replays.forEach((replay) => {
    if (
      !replay.players.some((player) => player.connectCode === userConnectCode)
    )
      return;

    const isPlayerPlayingCharacter = replay.players.some((player) => {
      return (
        player.connectCode === userConnectCode &&
        player.characterId ===
          playerCharacters.find(
            (playerCharacter) =>
              playerCharacter.connectCode === userConnectCode,
          )?.characterId
      );
    });
    if (!isPlayerPlayingCharacter) return;
    const isOpponentOtherCharacter = replay.players.some((player) => {
      return (
        player.connectCode !== userConnectCode &&
        player.characterId !==
          playerCharacters.find(
            (playerCharacter) =>
              playerCharacter.connectCode !== userConnectCode,
          )?.characterId
      );
    });
    const isCurrentMatchUp =
      isPlayerPlayingCharacter && isOpponentOtherCharacter;
    const isStage = replay.stageId == stageId;
    const isWin = replay.winnerConnectCode === userConnectCode;

    userStat.overallWinCount += isWin ? 1 : 0;
    userStat.overallLossCount += !isWin ? 1 : 0;

    userStat.currentMatchUpGameCount += isCurrentMatchUp ? 1 : 0;
    userStat.currentMatchUpWinCount += isWin && isCurrentMatchUp ? 1 : 0;
    userStat.currentMatchUpLossCount += !isWin && isCurrentMatchUp ? 1 : 0;

    userStat.stageGameCount += isStage ? 1 : 0;
    userStat.stageWinCount += isWin && isStage ? 1 : 0;
    userStat.stageLossCount += !isWin && isStage ? 1 : 0;

    userStat.currentMatchUpAndStageGameCount +=
      isCurrentMatchUp && isStage ? 1 : 0;
    userStat.currentMatchUpAndStageWinCount +=
      isWin && isCurrentMatchUp && isStage ? 1 : 0;
    userStat.currentMatchUpAndStageLossCount +=
      !isWin && isCurrentMatchUp && isStage ? 1 : 0;
  });

  userStat.overallWinRate =
    Math.round((userStat.overallWinCount / replays.length) * 100 * 10) / 10;
  userStat.stageWinRate =
    Math.round((userStat.stageWinCount / userStat.stageGameCount) * 100 * 10) /
    10;
  userStat.currentMatchUpWinRate =
    Math.round(
      (userStat.currentMatchUpWinCount / userStat.currentMatchUpGameCount) *
        100 *
        10,
    ) / 10;

  userStat.currentMatchUpAndStageWinRate =
    Math.round(
      (userStat.currentMatchUpAndStageWinCount /
        userStat.currentMatchUpAndStageGameCount) *
        100 *
        10,
    ) / 10;

  return userStat;
};

export const getStats = async (currentReplay: CurrentReplayInfo) => {
  const replayPlayers = currentReplay.players;
  const user = await determineUserBasedOnLiveGame(
    replayPlayers.map((player) => player.connectCode),
  );
  const { userReplays, headToHeadReplays } =
    await selectUserAndHeadToHeadReplays(
      user,
      replayPlayers.map((p) => p.connectCode),
    );

  const userStat = getUserStat(
    userReplays,
    replayPlayers,
    currentReplay.stageId,
    user,
  );
  const headToHeadStats = getHeadToHeadStats(
    headToHeadReplays,
    replayPlayers,
    currentReplay.stageId,
  );

  return { userStat, headToHeadStats, headToHeadReplays };
};

export const getMostRecentMatches = (
  replays: Replay[],
  numberOfReplays: number,
) => {
  const sortedReplays = replays.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return sortedReplays.slice(0, numberOfReplays);
};
