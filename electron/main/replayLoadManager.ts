import fs from "node:fs";
import path from "node:path";
import { getNumberOfWorkers, getReplayFiles, mainWindow } from "./utils";
import { ParserWorker } from "./parserWorker";
import { PARSE_BATCH_SIZE } from "../worker/protocol";
import type { ParseResults } from "../worker/protocol";
import type { ReplayFileInfo } from "../../src/replayParsing";
import { require } from "./vite_constants";
const { SlippiGame } = require("@slippi/slippi-js");

export class ReplayLoadManager {
  private static instance: ReplayLoadManager | null = null;
  private isLoadingSingleReplay = false;
  private isLoadingReplayDirectory = false;
  private totalReplaysToLoad = 0;
  private currentReplaysLoaded = 0;
  private replayFiles: ReplayFileInfo[] = [];
  /** Files requeued after a worker crash, re-parsed one at a time to isolate the culprit. */
  private isolatedFiles: ReplayFileInfo[] = [];
  private workers: ParserWorker[] = [];
  /** Batches handed to the renderer, keyed by token, awaiting an insert ack. */
  private awaitingInsert = new Map<number, ParserWorker | null>();
  private nextInsertToken = 1;
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
      this.finishLoading();
      return;
    }
    this.stopListeningForReplayFile();

    this.totalReplaysToLoad = newReplays.length;
    this.currentReplaysLoaded = 0;
    // Normalized to plain objects: these get structured-cloned to the workers.
    this.replayFiles = newReplays.map(({ name, path }) => ({ name, path }));
    this.isolatedFiles = [];
    this.startTimestamp = Date.now();

    // Workers are Node processes rather than renderers, so there is no need to
    // stagger the forks the way the old invisible-window pool did.
    const numberOfWorkers = getNumberOfWorkers(this.totalReplaysToLoad);
    for (let i = 0; i < numberOfWorkers; i++) {
      this.spawnWorker();
    }
  }

  public async beginLoadingReplayFile(file: ReplayFileInfo) {
    if (this.isLoadingReplays()) return;

    this.replayFiles = [file];
    this.isolatedFiles = [];
    this.isLoadingSingleReplay = true;
    this.totalReplaysToLoad = 1;
    this.currentReplaysLoaded = 0;
    this.startTimestamp = Date.now();

    this.spawnWorker();
  }

  /** Called from the `replays-inserted` handler once the renderer has committed a batch. */
  public onReplaysInserted({ token, count }: { token: number; count: number }) {
    const worker = this.awaitingInsert.get(token);
    this.awaitingInsert.delete(token);
    this.updateReplayLoadProgress(count);
    if (worker) this.dispatch(worker);
  }

  private spawnWorker() {
    const worker = new ParserWorker({
      onResults: (w, results) => this.onResults(w, results),
      onCrash: (w, lostFiles) => this.onCrash(w, lostFiles),
    });
    this.workers.push(worker);
    // ParserWorker holds the batch until the process signals it is ready.
    this.dispatch(worker);
    return worker;
  }

  private takeNextBatch(): ReplayFileInfo[] | null {
    if (this.isolatedFiles.length > 0) return this.isolatedFiles.splice(0, 1);
    if (this.replayFiles.length > 0)
      return this.replayFiles.splice(0, PARSE_BATCH_SIZE);
    return null;
  }

  private dispatch(worker: ParserWorker) {
    const files = this.takeNextBatch();
    if (!files) {
      this.retireWorker(worker);
      return;
    }
    worker.parse(files);
  }

  private onResults(worker: ParserWorker, results: ParseResults) {
    this.sendToRenderer(worker, results.replays, results.badReplays);
  }

  private onCrash(worker: ParserWorker, lostFiles: ReplayFileInfo[]) {
    this.workers = this.workers.filter((w) => w !== worker);

    if (lostFiles.length === 1) {
      // It was already isolated, so this one file is what killed the process.
      // Filing it as bad is both the right answer and what stops the retry loop.
      this.sendToRenderer(null, [], lostFiles);
    } else {
      this.isolatedFiles.unshift(...lostFiles);
    }

    if (this.isLoadingReplays()) {
      this.spawnWorker();
    }
  }

  /**
   * The renderer is the only writer: workers parse, main routes, and the main
   * window commits to IndexedDB and acks. The ack doubles as the backpressure
   * signal that releases the next batch to `worker`.
   */
  private sendToRenderer(
    worker: ParserWorker | null,
    replays: ParseResults["replays"],
    badReplays: ReplayFileInfo[],
  ) {
    const count = replays.length + badReplays.length;
    if (!mainWindow || mainWindow.isDestroyed()) {
      // Nowhere to store them; keep the pool moving rather than stalling on an ack.
      if (worker) this.dispatch(worker);
      return;
    }
    const token = this.nextInsertToken++;
    this.awaitingInsert.set(token, worker);
    mainWindow.webContents.send("insert-parsed-replays", {
      token,
      replays,
      badReplays,
      count,
    });
  }

  /**
   * Every worker is retired once the queue drains. The old design kept one alive
   * because spawning a renderer was expensive; a utilityProcess forks in ~575ms,
   * which is nothing on a path that runs once per finished game, and an idle
   * worker holds on to ~200MB of parse heap for as long as the app is open.
   */
  private retireWorker(worker: ParserWorker) {
    this.workers = this.workers.filter((w) => w !== worker);
    worker.retire();
    if (this.workers.length === 0) {
      this.finishLoading();
    }
  }

  private finishLoading() {
    if (this.isLoadingSingleReplay) {
      mainWindow?.webContents.send("update-stats");
    } else {
      mainWindow?.webContents.send("end-loading-replays");
    }
    this.isLoadingReplayDirectory = false;
    this.isLoadingSingleReplay = false;

    this.listenForReplayFile(this.replayDirectory);
  }

  public updateReplayLoadProgress(batch: number) {
    // we don't update progress for single replays
    // to avoid changing UI state
    if (this.isLoadingSingleReplay) return;

    this.currentReplaysLoaded += batch;
    const timeSpentLoading = Date.now() - this.startTimestamp;
    const replaysPerSecond =
      Math.round((this.currentReplaysLoaded / (timeSpentLoading / 1000)) * 100) /
      100;

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
