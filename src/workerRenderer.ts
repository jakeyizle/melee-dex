import { ipcRenderer } from "electron";
import { SlippiGame } from "@slippi/slippi-js";
import { insertReplay, insertBadReplay } from "./db/replays";
import { parseGameToReplay, ReplayFileInfo } from "./replayParsing";

ipcRenderer.on("start-load", async (event, args) => {
  const processedBatch = [];
  let loadReplays = true;

  while (loadReplays) {
    const files = await ipcRenderer.invoke("request-replays-to-load");
    if (!files || files.length === 0) {
      loadReplays = false;
    }

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const game = new SlippiGame(file.path);
          const result = parseGameToReplay(game, file);
          if (result.ok) {
            await insertReplay(result.replay);
          } else {
            await postBadReplay({ name: file.name, path: file.path });
          }
        } catch (e) {
          await postBadReplay({ name: file.name, path: file.path });
        } finally {
          processedBatch.push(file);
          if (processedBatch.length >= 10 || file === files[files.length - 1]) {
            ipcRenderer.invoke("replay-loaded", {
              batch: processedBatch.length,
            });
            processedBatch.length = 0;
          }
        }
      }
    }
  }
});

const postBadReplay = async ({ name, path }: ReplayFileInfo) => {
  await insertBadReplay({ name, path });
};
