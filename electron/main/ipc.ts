import { ipcMain, dialog, app } from "electron";
import { ReplayLoadManager } from "./replayLoadManager";
const replayLoadManager = ReplayLoadManager.getInstance();

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

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

    replayLoadManager.beginLoadingReplayDirectory(
      replayDirectory,
      existingReplayNames,
    );
  },
);

ipcMain.handle("request-replays-to-load", (event) => {
  const worker = event.sender;
  const replays = replayLoadManager.getNextReplaysToLoad(worker);
  return replays;
});

ipcMain.handle("replay-loaded", (event, args: { batch: number }) => {
  const { batch } = args;

  replayLoadManager.updateReplayLoadProgress(batch);
});
