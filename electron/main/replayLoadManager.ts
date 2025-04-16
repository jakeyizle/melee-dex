import { WebContents } from "electron";
import {
  createInvisWindow,
  getNumberOfWorkers,
  getReplayFiles,
  mainWindow,
  splitReplaysIntoChunks,
} from "./utils";

export class ReplayLoadManager {
  private static instance: ReplayLoadManager | null = null;
  private isLoadingReplays = false;
  private totalReplaysToLoad = 0;
  private currentReplaysLoaded = 0;
  private workerWebContents: WebContents[] = [];

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

    const numberOfWorkers = getNumberOfWorkers(this.totalReplaysToLoad);
    const chunks = splitReplaysIntoChunks(newReplays, numberOfWorkers);
    for (const chunk of chunks) {
      this.workerWebContents.push(createInvisWindow(chunk));
    }
  }

  public async beginLoadingReplayFile(file: { path: string; name: string }) {
    if (this.isLoadingReplays) return;
    this.isLoadingReplays = true;
    this.totalReplaysToLoad = 1;
    this.currentReplaysLoaded = 0;
    createInvisWindow([file]);
  }

  public endLoadingReplays(webContents: WebContents) {
    webContents.close();
    this.workerWebContents = this.workerWebContents.filter(
      (c) => c !== webContents,
    );
    if (this.workerWebContents.length === 0) {
      this.isLoadingReplays = false;
      mainWindow?.webContents.send("end-loading-replays");
    }
  }

  public updateReplayLoadProgress(batch: number) {
    this.currentReplaysLoaded += batch;
    mainWindow?.webContents.send("update-replay-load-progress", {
      totalReplaysToLoad: this.totalReplaysToLoad,
      currentReplaysLoaded: this.currentReplaysLoaded,
    });
  }
}
