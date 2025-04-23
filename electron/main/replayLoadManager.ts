import fs from "node:fs";
import path from "node:path";
import { WebContents } from "electron";
import {
  createInvisWindow,
  getBatchSize,
  getNumberOfWorkers,
  getReplayFiles,
  mainWindow,
  ReplayFile,
} from "./utils";
import { require } from "./vite_constants";
const { SlippiGame } = require("@slippi/slippi-js");

export class ReplayLoadManager {
  private static instance: ReplayLoadManager | null = null;
  private isLoadingSingleReplay = false;
  private isLoadingReplayDirectory = false;
  private totalReplaysToLoad = 0;
  private currentReplaysLoaded = 0;
  private replayFiles: ReplayFile[] = [];
  private workerWebContents: WebContents[] = [];
  private batchSize = 0;
  private startTimestamp = 0;
  private replayDirectory = "";
  private watcher: fs.FSWatcher | null = null;

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
    if (this.isLoadingReplays()) return;
    this.isLoadingReplayDirectory = true;
    this.replayDirectory = replayDirectory;
    const replays = await getReplayFiles(replayDirectory);

    const newReplays = replays.filter(
      (replay) => !existingReplayNames.includes(replay.name),
    );

    if (newReplays.length === 0) {
      this.endLoadingReplays();
      return;
    }
    this.stopListeningForReplayFile();

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
    if (this.isLoadingReplays()) return;

    this.replayFiles = [file];
    this.isLoadingSingleReplay = true;
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
      this.isLoadingReplayDirectory = false;
      this.isLoadingSingleReplay = false;
      mainWindow?.webContents.send("end-loading-replays");
      this.listenForReplayFile(this.replayDirectory);
      return;
    }
    webContents.close();
    this.workerWebContents = this.workerWebContents.filter(
      (c) => c !== webContents,
    );
  }

  public updateReplayLoadProgress(batch: number) {
    // we don't update progress for single replays
    // to avoid changing UI state
    if (this.isLoadingSingleReplay) return;

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

  listenForReplayFile = (directory: string) => {
    this.watcher?.close();
    this.watcher = fs.watch(
      directory,
      { recursive: true },
      (event, filename) => {
        if (filename && !this.isLoadingReplays()) {
          try {
            const filePath = path.join(directory, filename);
            const game = new SlippiGame(filePath);

            const winners = game.getWinners();
            if (winners.length > 0) {
              const metadata = game.getMetadata();
              const lastFrame = metadata.lastFrame;
              if (lastFrame <= 30 * 60) return;
              const path = directory + "/" + filename;
              // filename can sometimes include subdirectories of directory
              // but just want the actual file name
              const name = filename.split("/").pop() || filename;
              this.beginLoadingReplayFile({ path, name });
            }

            const settings = game.getSettings();
            const players = settings?.players.map((player: any) => {
              return {
                connectCode: player.connectCode,
                name: player.displayName,
                characterId: (player.characterId || 0).toString(),
              };
            });
            const stageId = settings.stageId;
            mainWindow?.webContents.send("live-replay-loaded", {
              filename,
              players,
              stageId,
            });
          } catch (_e) {}
        }
      },
    );
  };

  stopListeningForReplayFile = () => {
    this.watcher?.close();
  };

  isLoadingReplays = () => {
    return this.isLoadingReplayDirectory || this.isLoadingSingleReplay;
  };
}
