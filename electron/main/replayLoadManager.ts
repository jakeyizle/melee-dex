import { BrowserWindow } from "electron";
import { createInvisWindow, getReplayFiles } from "./utils";
import { mainWindow } from "./utils";

export class ReplayLoadManager {
  private static instance: ReplayLoadManager | null = null;
  private isLoadingReplays = false;
  private totalReplaysToLoad = 0;
  private currentReplaysLoaded = 0;
  private totalReplays = 0;

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ReplayLoadManager();
    }
    return this.instance;
  }

  public async beginLoadingReplays(
    replayDirectory: string | undefined,
    existingReplayNames: string[],
  ) {
    if (!replayDirectory) return;
    if (this.isLoadingReplays) return;
    this.isLoadingReplays = true;

    const replays = await getReplayFiles(replayDirectory);
    this.totalReplays = replays.length;

    const newReplays = replays.filter(
      (replay) => !existingReplayNames.includes(replay.name),
    );

    if (newReplays.length === 0) {
      this.isLoadingReplays = false;
      mainWindow?.webContents.send("end-loading-replays", {
        totalReplays: this.totalReplays,
      });
      return;
    }

    this.totalReplaysToLoad = newReplays.length;
    this.currentReplaysLoaded = 0;

    mainWindow?.webContents.send("begin-loading-replays", {
      replayDirectory,
      existingReplayNames,
    });

    createInvisWindow(newReplays);
  }

  public endLoadingReplays() {
    this.isLoadingReplays = false;
    mainWindow?.webContents.send("end-loading-replays", {
      totalReplays: this.totalReplays,
    });
  }

  public updateReplayLoadProgress() {
    this.currentReplaysLoaded++;
    mainWindow?.webContents.send("update-replay-load-progress", {
      totalReplaysToLoad: this.totalReplaysToLoad,
      currentReplaysLoaded: this.currentReplaysLoaded,
    });
  }
}
