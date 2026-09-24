import { ipcMain, dialog, app } from "electron";
import { ReplayLoadManager } from "./replayLoadManager";
import { getRankProfile, setRankServiceUserAgent } from "./rankService";
import electronUpdater from "electron-updater";
import log from "electron-log";
const replayLoadManager = ReplayLoadManager.getInstance();

// version
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// update
let hasCheckedForUpdates = false;
ipcMain.handle("check-for-updates", async (event) => {
  if (hasCheckedForUpdates) return;
  hasCheckedForUpdates = true;

  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = log;
  log.transports.file.level = "info";

  autoUpdater.on("update-available", () => {
    autoUpdater.downloadUpdate().catch((error) => {
      log.error("Could not download the update", error);
    });
  });

  autoUpdater.on("update-downloaded", () => {
    event.sender.send("update-ready");
  });

  // An unreachable update server is routine — no network, GitHub down, a
  // corporate proxy. `checkForUpdates` rejects in that case, and nothing was
  // awaiting it, so it surfaced as an unhandled rejection in main and told
  // nobody anything. Failing to check for updates must never be fatal.
  autoUpdater.on("error", (error) => {
    log.error("Update check failed", error);
  });

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error("Update check failed", error);
  }
});

// rank
// One lookup per connect code per TTL, cached and rate-limited in rankService.
// It never throws: an unreachable endpoint is a missing badge, nothing more.
setRankServiceUserAgent(
  `melee-dex/${app.getVersion()} (+https://github.com/jakeyizle/melee-dex)`,
);

ipcMain.handle(
  "get-rank-profile",
  async (_event, args: { connectCode: string }) => {
    return await getRankProfile(args.connectCode);
  },
);

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

    // Awaited, and the answer returned: the renderer only shows its progress
    // bar when an import really started.
    return await replayLoadManager.beginLoadingReplayDirectory(
      replayDirectory,
      existingReplayNames,
    );
  },
);

ipcMain.handle(
  "replays-inserted",
  (_event, args: { token: number; count: number }) => {
    replayLoadManager.onReplaysInserted(args);
  },
);
