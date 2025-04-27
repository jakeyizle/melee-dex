import { ipcMain, dialog, app } from "electron";
import { ReplayLoadManager } from "./replayLoadManager";
import electronUpdater from "electron-updater";
import log from "electron-log";
const replayLoadManager = ReplayLoadManager.getInstance();

// version
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// update
let hasUpdated = false;
ipcMain.handle("check-for-updates", (event) => {
  if (hasUpdated) return;
  hasUpdated = true;
  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = log;
  log.transports.file.level = "info";
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.checkForUpdates();

  autoUpdater.on("update-available", (info) => {
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-downloaded", (info) => {
    event.sender.send("update-ready");
  });
});

// settings
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

// replay loading
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
