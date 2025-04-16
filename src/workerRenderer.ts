import { ipcRenderer } from "electron";
import { SlippiGame } from "@slippi/slippi-js";
import {
  ReplayPlayer,
  Replay,
  insertReplay,
  insertBadReplay,
} from "./db/replays";

ipcRenderer.on("start-load", async (event, args) => {
  const files = args.files;
  try {
    for (const file of files) {
      try {
        const game = new SlippiGame(file.path);
        const metadata = game.getMetadata();
        const settings = game.getSettings();
        if (settings?.players.filter((p) => p.type === 0).length !== 2) {
          await insertBadReplay({ name: file.name, path: file.path });
          continue;
        }
        const winners = tryGetWinner(game);

        if (!settings?.players || !metadata?.startAt || winners.length === 0) {
          await insertBadReplay({ name: file.name, path: file.path });
          continue;
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
          characterId:
            (settings.players[0].characterId || 0).toString() ||
            Object.values(metadata.players![0].characters)[0].toString(),
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
          characterId:
            (settings.players[1].characterId || 0).toString() ||
            Object.values(metadata.players![1].characters)[0].toString(),
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
        if (isReplayValid(replay)) {
          await insertReplay(replay);
        } else {
          await insertBadReplay({ name: file.name, path: file.path });
        }
      } catch (e) {
        await insertBadReplay({ name: file.name, path: file.path });
      } finally {
        ipcRenderer.invoke("replay-loaded");
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    ipcRenderer.invoke("worker-finished");
  }
});

const isReplayValid = (replay: Replay) => {
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

const tryGetWinner = (game: SlippiGame) => {
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
