import type { SlippiGame } from "@slippi/slippi-js/node";
import type { ReplayPlayer, Replay, ReplayMode } from "./db/replays";

export type ReplayFileInfo = { name: string; path: string };

export type RejectReason =
  | "not-two-human-players"
  | "missing-settings-or-start-time"
  | "too-short"
  | "no-winner"
  | "invalid-replay"
  /** Threw while being read: a partial write, a corrupt file, or not a replay at all. */
  | "unreadable";

/** A file that will not be imported, and why. */
export type RejectedReplay = ReplayFileInfo & { reason: RejectReason };

export type ParseResult =
  | { ok: true; replay: Replay }
  | { ok: false; reason: RejectReason };

/** One player's state on the last frame of a game. */
export type FinalStock = {
  playerIndex: number;
  isFollower: boolean;
  stocksRemaining: number;
  percent: number;
};

/**
 * Supplies the last frame's stocks without parsing the game, so `tryGetWinner`
 * can skip `getStats()`. A thunk rather than a value because the common case
 * never needs it, and `null` whenever it cannot be read.
 *
 * Only the parser worker passes one — it is implemented in
 * `electron/worker/tailReader.ts`, which reads the file directly, and this
 * module is also imported by the renderer, where `node:fs` does not exist.
 */
export type ReadFinalStocks = () => FinalStock[] | null;

/**
 * Every field the rest of the app indexes, groups or compares on has to be
 * present. The player-count check returns early rather than joining the rest:
 * the previous version read `players[1]` after that check had already failed,
 * so a one-player replay threw instead of returning false.
 */
export const isReplayValid = (replay: Replay) => {
  if (replay.players.length !== 2) return false;

  return (
    replay.name !== "" &&
    replay.path !== "" &&
    replay.date !== "" &&
    replay.stageId !== "" &&
    replay.winnerConnectCode !== "" &&
    replay.players.every(
      (player) => player.connectCode !== "" && player.characterId !== "",
    )
  );
};

/**
 * Ranked is the only mode with a set structure, so it is the only one worth
 * naming. The id looks like `mode.unranked-2025-04-18T03:01:45.00-3`; replays
 * from before slp 3.14 have none at all, and are unranked by default.
 */
export const getReplayMode = (matchId: string | undefined): ReplayMode =>
  matchId?.startsWith("mode.ranked") ? "ranked" : "unranked";

/**
 * Reads the last frame's stocks and names a winner, or `undefined` when they do
 * not settle it.
 *
 * Only an outright difference in stocks counts. A tie is left alone on purpose:
 * today it falls through to the stock-counting below, which also declines it,
 * and the replay is rejected as having no winner. Breaking the tie on percent
 * here — as slippi-js does — would quietly start accepting games the app has
 * always thrown away.
 */
const winnerFromFinalStocks = (readFinalStocks: ReadFinalStocks) => {
  const stocks = readFinalStocks();
  // Indices 0 and 1 to match the stock counting below, which hardcodes them.
  const playerOne = stocks?.find((s) => s.playerIndex === 0);
  const playerTwo = stocks?.find((s) => s.playerIndex === 1);
  if (!playerOne || !playerTwo) return undefined;
  if (playerOne.stocksRemaining === playerTwo.stocksRemaining) return undefined;

  const winnerIndex =
    playerOne.stocksRemaining > playerTwo.stocksRemaining ? 0 : 1;
  return [{ playerIndex: winnerIndex, position: 0 }];
};

export const tryGetWinner = (
  game: SlippiGame,
  readFinalStocks?: ReadFinalStocks,
) => {
  let winners = game.getWinners();
  if (winners.length === 0) {
    // Costs about 0.3ms and answers for most of what getWinners() gives up on,
    // so it goes ahead of getStats(), which costs up to 1200ms and ~50MB.
    if (readFinalStocks) {
      const fromStocks = winnerFromFinalStocks(readFinalStocks);
      if (fromStocks) return fromStocks;
    }
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
  readFinalStocks?: ReadFinalStocks,
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
  const winners = tryGetWinner(game, readFinalStocks);
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

  // All four come out of the GAME_START header block and the metadata slippi-js
  // has already read, so they cost nothing on top of the parse that got us here.
  //
  // `matchId` was deprecated in slippi-js 7.2 in favour of `sessionId`, which
  // carries the identical value — so read the new name first and keep the old
  // one as the fallback for whenever it is finally removed. The stored field
  // stays `matchId`: renaming it would mean migrating every row for nothing.
  const matchId =
    settings.matchInfo?.sessionId ?? settings.matchInfo?.matchId ?? "";

  const replay: Replay = {
    name: file.name,
    path: file.path,
    date: metadata.startAt,
    players: [playerOne, playerTwo],
    winnerConnectCode: winnerCode,
    stageId: stageId?.toString() || "",
    mode: getReplayMode(matchId),
    matchId,
    gameNumber: settings.matchInfo?.gameNumber ?? null,
    lastFrame: metadata.lastFrame ?? null,
  };

  if (!isReplayValid(replay)) {
    return { ok: false, reason: "invalid-replay" };
  }

  return { ok: true, replay };
};
