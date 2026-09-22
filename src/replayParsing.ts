import { SlippiGame } from "@slippi/slippi-js";
import { ReplayPlayer, Replay } from "./db/replays";

export type ReplayFileInfo = { name: string; path: string };

export type RejectReason =
  | "not-two-human-players"
  | "missing-settings-or-start-time"
  | "too-short"
  | "no-winner"
  | "invalid-replay";

export type ParseResult =
  | { ok: true; replay: Replay }
  | { ok: false; reason: RejectReason };

export const isReplayValid = (replay: Replay) => {
  let isValid = true;
  if (replay.name === "") isValid = false;
  if (replay.path === "") isValid = false;
  if (replay.date === "") isValid = false;
  if (replay.players.length !== 2) isValid = false;
  if (replay.winnerConnectCode === "") isValid = false;
  if (replay.players[0].connectCode === "") isValid = false;
  if (replay.players[0].characterId === "") isValid = false;
  if (replay.players[1].connectCode === "") isValid = false;
  if (replay.players[1].characterId === "") isValid = false;
  if (replay.stageId === "") isValid = false;
  return isValid;
};

export const tryGetWinner = (game: SlippiGame) => {
  let winners = game.getWinners();
  if (winners.length === 0) {
    const stats = game.getStats();
    // there are more stocks objects the more stocks the player has lost
    // end frame is null when the player is on a stock, but hasn't lost it
    const stocks = stats?.stocks;
    const playerOneStocks =
      stocks?.filter((s) => s.playerIndex === 0 && !!s.endFrame).length || 0;
    const playerTwoStocks =
      stocks?.filter((s) => s.playerIndex === 1 && !!s.endFrame).length || 0;
    if (playerOneStocks > playerTwoStocks) {
      winners = [{ playerIndex: 1, position: 0 }];
    } else if (playerTwoStocks > playerOneStocks) {
      winners = [{ playerIndex: 0, position: 0 }];
    }
  }
  return winners;
};

// The order of the checks below is load-bearing: the winner check is last because
// game.getStats() is slow, and we want cheap rejections to short-circuit before it.
export const parseGameToReplay = (
  game: SlippiGame,
  file: ReplayFileInfo,
): ParseResult => {
  const metadata = game.getMetadata();
  const settings = game.getSettings();

  if (settings?.players.filter((p) => p.type === 0).length !== 2) {
    return { ok: false, reason: "not-two-human-players" };
  }
  if (!settings?.players || !metadata?.startAt) {
    return { ok: false, reason: "missing-settings-or-start-time" };
  }
  if (metadata.lastFrame && metadata.lastFrame <= 30 * 60) {
    return { ok: false, reason: "too-short" };
  }

  // we do this as late as possible because it's slow
  const winners = tryGetWinner(game);
  if (winners.length === 0) {
    return { ok: false, reason: "no-winner" };
  }

  const playerOne: ReplayPlayer = {
    connectCode:
      settings.players[0].connectCode ||
      metadata?.players?.[0]?.names?.code ||
      "",
    name:
      settings.players[0].displayName ||
      metadata?.players?.[0]?.names?.netplay ||
      "",
    characterId: (
      settings.players[0].characterId ??
      Object.values(metadata.players![0].characters)[0]
    ).toString(),
  };

  const playerTwo: ReplayPlayer = {
    connectCode:
      settings.players[1].connectCode ||
      metadata?.players?.[1]?.names?.code ||
      "",
    name:
      settings.players[1].displayName ||
      metadata?.players?.[1]?.names?.netplay ||
      "",
    characterId: (
      settings.players[1].characterId ??
      Object.values(metadata.players![1].characters)[0]
    ).toString(),
  };

  const stageId = settings.stageId;
  const winnerIndex = winners[0].playerIndex;
  const winnerCode =
    winnerIndex === 0 ? playerOne.connectCode : playerTwo.connectCode;

  const replay: Replay = {
    name: file.name,
    path: file.path,
    date: metadata.startAt,
    players: [playerOne, playerTwo],
    winnerConnectCode: winnerCode,
    stageId: stageId?.toString() || "",
  };

  if (!isReplayValid(replay)) {
    return { ok: false, reason: "invalid-replay" };
  }

  return { ok: true, replay };
};
