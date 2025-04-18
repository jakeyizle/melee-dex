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

type PlayerStat = {
  connectCode: string;
  overallWinCount: number;
  overallLossCount: number;
  overallWinRate: number;
  currentMatchUpWinCount: number;
  currentMatchUpLossCount: number;
  currentMatchUpWinRate: number;
  characterUsage: CharacterUsageStat[];
  currentCharacterId: string;
};

export const getHeadToHeadStats = (
  replays: Replay[],
  playerCharacters: PlayerCharacter[],
): PlayerStat[] => {
  const playerStats: PlayerStat[] = playerCharacters.map((playerCharacter) => {
    return {
      connectCode: playerCharacter.connectCode,
      overallWinCount: 0,
      overallLossCount: 0,
      overallWinRate: 0,
      currentMatchUpWinCount: 0,
      currentMatchUpLossCount: 0,
      currentMatchUpWinRate: 0,
      characterUsage: [],
      currentCharacterId: playerCharacter.characterId,
    };
  });
  replays.forEach((replay) => {
    playerStats.forEach((playerStat) => {
      const player = replay.players.find(
        (player) => player.connectCode === playerStat.connectCode,
      );
      if (!player) return;
      const isWin = player.connectCode === replay.winnerConnectCode;
      const isCurrentMatchUp =
        player.characterId === playerStat.currentCharacterId;
      playerStat.overallWinCount += isWin ? 1 : 0;
      playerStat.overallLossCount += !isWin ? 1 : 0;
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
        (playerStat.currentMatchUpWinCount / replays.length) * 100 * 10,
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
