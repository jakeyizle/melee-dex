import { ipcMain, dialog } from "electron";
import {
  listenForReplayFile,
  mainWindow,
  stopListeningForReplayFile,
} from "./utils";
import { ReplayLoadManager } from "./replayLoadManager";
const replayLoadManager = ReplayLoadManager.getInstance();

ipcMain.handle("select-directory", async (event, arg) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (canceled) {
    return null;
  } else {
    if (!filePaths[0]) return null;
    return filePaths[0];
  }
});

ipcMain.handle(
  "begin-loading-replays",
  async (
    _event,
    args: {
      replayDirectory: string | undefined;
      existingReplayNames: string[];
    },
  ) => {
    const { replayDirectory, existingReplayNames } = args;
    console.log(
      "begin-loading-replays",
      replayDirectory,
      existingReplayNames.length,
    );
    replayLoadManager.beginLoadingReplayDirectory(
      replayDirectory,
      existingReplayNames,
    );
  },
);

ipcMain.handle("worker-finished", (event) => {
  console.log("worker-finished");
  const worker = event.sender;
  replayLoadManager.endLoadingReplays(worker);
});

ipcMain.handle("replay-loaded", (event, args: { batch: number }) => {
  const { batch } = args;
  replayLoadManager.updateReplayLoadProgress(batch);
});

ipcMain.handle("listen-for-new-replays", (event, args) => {
  const { replayDirectory } = args;
  if (!replayDirectory) return;
  listenForReplayFile(replayDirectory);
});

ipcMain.handle("stop-listening-for-new-replays", () => {
  stopListeningForReplayFile();
});
