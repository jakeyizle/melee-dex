import { WebContents } from "electron";
import {
  createInvisWindow,
  getBatchSize,
  getNumberOfWorkers,
  getReplayFiles,
  listenForReplayFile,
  mainWindow,
  ReplayFile,
  stopListeningForReplayFile,
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
  private replayDirectory = "";
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
    console.log("beginLoadingReplayDirectory", this.isLoadingReplays);
    if (!replayDirectory) return;
    if (this.isLoadingReplays) return;
    this.isLoadingReplays = true;
    this.replayDirectory = replayDirectory;
    const replays = await getReplayFiles(replayDirectory);

    const newReplays = replays.filter(
      (replay) => !existingReplayNames.includes(replay.name),
    );

    if (newReplays.length === 0) {
      this.endLoadingReplays();
      return;
    }
    stopListeningForReplayFile();

    this.totalReplaysToLoad = newReplays.length;
    this.currentReplaysLoaded = 0;
    this.replayFiles = newReplays;
    const numberOfWorkers = getNumberOfWorkers(this.totalReplaysToLoad);
    this.batchSize = getBatchSize(this.totalReplaysToLoad, numberOfWorkers);
    this.startTimestamp = Date.now();

    if (this.workerWebContents.length > 0) {
      this.workerWebContents.forEach((webContents) => webContents.close());
      this.workerWebContents = [];
    }
    for (let i = 0; i < numberOfWorkers; i++) {
      this.workerWebContents.push(createInvisWindow());
      // add a delay to smooth this out
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  public getNextReplaysToLoad(webContents: WebContents) {
    if (this.replayFiles.length === 0) {
      this.endLoadingReplays(webContents);
      return;
    }
    const replayFiles = this.replayFiles.splice(0, this.batchSize);
    return replayFiles;
  }

  public async beginLoadingReplayFile(file: { path: string; name: string }) {
    console.log(
      "beginLoadingReplayFile",
      this.isLoadingReplays,
      this.workerWebContents.length,
    );
    if (this.isLoadingReplays) return;
    stopListeningForReplayFile();
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

  public endLoadingReplays(webContents?: WebContents) {
    // keep 1 worker in background, so we can avoid spinning new workers to load 1 file at a time
    if (this.workerWebContents.length <= 1 || !webContents) {
      this.isLoadingReplays = false;
      mainWindow?.webContents.send("end-loading-replays");
      listenForReplayFile(this.replayDirectory);
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
