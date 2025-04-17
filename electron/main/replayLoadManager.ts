import { WebContents } from "electron";
import {
  createInvisWindow,
  getBatchSize,
  getNumberOfWorkers,
  getReplayFiles,
  mainWindow,
  ReplayFile,
} from "./utils";

export class ReplayLoadManager {
  private static instance: ReplayLoadManager | null = null;
  private isLoadingReplays = false;
  private totalReplaysToLoad = 0;
  private currentReplaysLoaded = 0;
  private replayFiles: ReplayFile[] = [];
  private workerWebContents: WebContents[] = [];
  private batchSize = 0;
  private startTimestamp = 0;
  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ReplayLoadManager();
    }
    return this.instance;
  }

  public async beginLoadingReplayDirectory(
    replayDirectory: string | undefined,
    existingReplayNames: string[],
  ) {
    if (!replayDirectory) return;
    if (this.isLoadingReplays) return;
    this.isLoadingReplays = true;

    const replays = await getReplayFiles(replayDirectory);

    const newReplays = replays.filter(
      (replay) => !existingReplayNames.includes(replay.name),
    );

    if (newReplays.length === 0) {
      this.isLoadingReplays = false;
      mainWindow?.webContents.send("end-loading-replays");
      return;
    }

    this.totalReplaysToLoad = newReplays.length;
    this.currentReplaysLoaded = 0;
    this.replayFiles = newReplays;
    console.log("beginLoadingReplayDirectory", this.totalReplaysToLoad);
    const numberOfWorkers = getNumberOfWorkers(this.totalReplaysToLoad);
    this.batchSize = getBatchSize(this.totalReplaysToLoad, numberOfWorkers);
    this.startTimestamp = Date.now();
    for (let i = 0; i < numberOfWorkers; i++) {
      this.workerWebContents.push(createInvisWindow());
      // add a delay to smooth this out
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  public getNextReplaysToLoad(webContents: WebContents) {
    console.log("getNextReplaysToLoad", this.replayFiles.length);
    const replayFiles = this.replayFiles.splice(0, this.batchSize);
    if (replayFiles.length === 0) {
      this.endLoadingReplays(webContents);
      return;
    }
    return replayFiles;
  }

  public async beginLoadingReplayFile(file: { path: string; name: string }) {
    if (this.isLoadingReplays) return;
    this.replayFiles = [file];
    this.isLoadingReplays = true;
    this.totalReplaysToLoad = 1;
    this.currentReplaysLoaded = 0;
    this.batchSize = 1;
    // we should have 1 worker up
    this.startTimestamp = Date.now();
    if (this.workerWebContents.length === 0) {
      this.workerWebContents.push(createInvisWindow());
    } else {
      const webContents = this.workerWebContents[0];
      webContents.send("start-load");
    }
  }

  public endLoadingReplays(webContents: WebContents) {
    // keep 1 worker in background, so we can avoid spinning new workers to load 1 file at a time
    if (this.workerWebContents.length === 1) {
      this.isLoadingReplays = false;
      mainWindow?.webContents.send("end-loading-replays");
      return;
    }
    webContents.close();
    this.workerWebContents = this.workerWebContents.filter(
      (c) => c !== webContents,
    );
  }

  public updateReplayLoadProgress(batch: number) {
    this.currentReplaysLoaded += batch;
    const timeSpentLoading = Date.now() - this.startTimestamp;
    const replaysPerSecond =
      Math.round(
        (this.currentReplaysLoaded / (timeSpentLoading / 1000)) * 100,
      ) / 100;

    mainWindow?.webContents.send("update-replay-load-progress", {
      totalReplaysToLoad: this.totalReplaysToLoad,
      currentReplaysLoaded: this.currentReplaysLoaded,
      replaysPerSecond: replaysPerSecond,
    });
  }
}
