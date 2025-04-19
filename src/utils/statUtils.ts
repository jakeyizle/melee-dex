import { Replay } from "@/db/replays";

type PlayerCharacter = {
  connectCode: string;
  characterId: string;
};

type CharacterUsageStat = {
  characterId: string;
  playCount: number;
  winCount: number;
  lossCount: number;
  playRate: number;
};

type HeadToHeadStat = {
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

export const getHeadToHeadStats = (
  replays: Replay[],
  playerCharacters: PlayerCharacter[],
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

    // sort character usage by play count and keep only top 3
    playerStat.characterUsage.sort((a, b) => b.playCount - a.playCount);
    playerStat.characterUsage = playerStat.characterUsage.slice(0, 3);

    playerStat.characterUsage.forEach((characterUsage) => {
      characterUsage.playRate =
        Math.round((characterUsage.playCount / replays.length) * 100 * 10) / 10;
    });
  });

  return playerStats;
};

type UserStat = {
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

export const getUserStats = (
  replays: Replay[],
  playerCharacters: PlayerCharacter[] | undefined,
  stageId: string,
  userConnectCode: string,
) => {
  const userStats: UserStat = {
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
    return userStats;

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

    userStats.overallWinCount += isWin ? 1 : 0;
    userStats.overallLossCount += !isWin ? 1 : 0;

    userStats.currentMatchUpGameCount += isCurrentMatchUp ? 1 : 0;
    userStats.currentMatchUpWinCount += isWin && isCurrentMatchUp ? 1 : 0;
    userStats.currentMatchUpLossCount += !isWin && isCurrentMatchUp ? 1 : 0;

    userStats.stageGameCount += isStage ? 1 : 0;
    userStats.stageWinCount += isWin && isStage ? 1 : 0;
    userStats.stageLossCount += !isWin && isStage ? 1 : 0;

    userStats.currentMatchUpAndStageGameCount +=
      isCurrentMatchUp && isStage ? 1 : 0;
    userStats.currentMatchUpAndStageWinCount +=
      isWin && isCurrentMatchUp && isStage ? 1 : 0;
    userStats.currentMatchUpAndStageLossCount +=
      !isWin && isCurrentMatchUp && isStage ? 1 : 0;
  });

  userStats.overallWinRate =
    Math.round((userStats.overallWinCount / replays.length) * 100 * 10) / 10;
  userStats.stageWinRate =
    Math.round(
      (userStats.stageWinCount / userStats.stageGameCount) * 100 * 10,
    ) / 10;
  userStats.currentMatchUpWinRate =
    Math.round(
      (userStats.currentMatchUpWinCount / userStats.currentMatchUpGameCount) *
        100 *
        10,
    ) / 10;

  userStats.currentMatchUpAndStageWinRate =
    Math.round(
      (userStats.currentMatchUpAndStageWinCount /
        userStats.currentMatchUpAndStageGameCount) *
        100 *
        10,
    ) / 10;

  return userStats;
};
