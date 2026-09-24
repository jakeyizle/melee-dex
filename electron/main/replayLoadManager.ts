import fs from "node:fs";
import path from "node:path";
import { getNumberOfWorkers, getReplayFiles, mainWindow } from "./utils";
import { ParserWorker } from "./parserWorker";
import { PARSE_BATCH_SIZE } from "../worker/protocol";
import type { ParseResults } from "../worker/protocol";
import type { ReplayFileInfo, RejectedReplay } from "../../src/replayParsing";
import { require } from "./vite_constants";
const { SlippiGame } = require("@slippi/slippi-js/node");

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
  /**
   * Live files already handed to a worker. fs.watch keeps firing for a finished
   * replay — and the watcher is re-attached after every load — so without this
   * the same game is ingested repeatedly and counted into the stats each time.
   */
  private ingestedLiveFiles = new Set<string>();
  /**
   * The set only exists to spot repeats, and repeats arrive within moments of
   * each other. Keeping every path a session ever saw meant it grew without
   * limit for anyone who left the app open.
   */
  private static readonly MAX_INGESTED_LIVE_FILES = 200;
  /** Name of the replay the single-replay load actually stored, if any. */
  private loadedLiveReplayName: string | null = null;

  private constructor() {}

  public static getInstance() {
    if (!this.instance) {
      this.instance = new ReplayLoadManager();
    }
    return this.instance;
  }

  /**
   * Returns whether an import actually started. The renderer shows its progress
   * bar on the strength of that answer and has no other way to take it down —
   * when this declines the work, no `end-loading-replays` is coming.
   */
  public async beginLoadingReplayDirectory(
    replayDirectory: string | undefined,
    existingReplayNames: string[],
  ): Promise<boolean> {
    if (!replayDirectory) return false;
    if (this.isLoadingReplays()) return false;
    this.isLoadingReplayDirectory = true;
    this.replayDirectory = replayDirectory;

    let replays: ReplayFileInfo[];
    try {
      replays = await getReplayFiles(replayDirectory);
    } catch (error) {
      // Usually the replay directory has been moved or deleted. Finish the load
      // so the renderer drops its progress bar and still builds stats from what
      // is already in IndexedDB.
      console.error("Could not read the replay directory", error);
      // Say so. Otherwise the renderer drops its progress bar and shows
      // "Listening for Games" over a stale library, looking perfectly healthy
      // while ingesting nothing at all.
      mainWindow?.webContents.send("replay-directory-unreadable", {
        replayDirectory,
      });
      this.finishLoading();
      return false;
    }

    // A Set, not `existingReplayNames.includes`: both sides are the size of the
    // whole library, so the array scan was one comparison per known replay per
    // file on disk.
    const knownReplayNames = new Set(existingReplayNames);
    const newReplays = replays.filter(
      (replay) => !knownReplayNames.has(replay.name),
    );

    if (newReplays.length === 0) {
      // finishLoading has already told the renderer the load is over, so it
      // must not be asked to show a progress bar for it.
      this.finishLoading();
      return false;
    }
    this.stopListeningForReplayFile();

    this.totalReplaysToLoad = newReplays.length;
    this.currentReplaysLoaded = 0;
    // Already plain `{ name, path }` objects, which is what lets them be
    // structured-cloned to the workers.
    this.replayFiles = newReplays;
    this.isolatedFiles = [];
    this.startTimestamp = Date.now();

    // Workers are Node processes rather than renderers, so there is no need to
    // stagger the forks the way the old invisible-window pool did.
    const numberOfWorkers = getNumberOfWorkers(this.totalReplaysToLoad);
    for (let i = 0; i < numberOfWorkers; i++) {
      this.spawnWorker();
    }
    return true;
  }

  public async beginLoadingReplayFile(file: ReplayFileInfo) {
    if (this.isLoadingReplays()) return;

    this.replayFiles = [file];
    this.isolatedFiles = [];
    this.loadedLiveReplayName = null;
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
    if (this.isLoadingSingleReplay && results.replays.length > 0) {
      this.loadedLiveReplayName = results.replays[0].name;
    }
    this.sendToRenderer(worker, results.replays, results.badReplays);
  }

  private onCrash(worker: ParserWorker, lostFiles: ReplayFileInfo[]) {
    this.workers = this.workers.filter((w) => w !== worker);

    // A dead worker must not be dispatched to. Its batch is already awaiting an
    // ack, and `dispatch` would splice the next files off the queue and hand
    // them to a process that silently refuses them — losing them for this run.
    // The replacement spawned below picks that work up instead.
    for (const [token, awaitingWorker] of this.awaitingInsert) {
      if (awaitingWorker === worker) this.awaitingInsert.set(token, null);
    }

    if (lostFiles.length === 1) {
      // It was already isolated, so this one file is what killed the process.
      // Filing it as bad is both the right answer and what stops the retry loop.
      this.sendToRenderer(
        null,
        [],
        lostFiles.map((file) => ({ ...file, reason: "unreadable" as const })),
      );
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
    badReplays: RejectedReplay[],
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
      // Only when the parser accepted the file. A rejected live game (a match
      // against a CPU, a parse failure) stores nothing, and announcing it would
      // make the renderer fold its previous replay into the stats twice.
      if (this.loadedLiveReplayName) {
        mainWindow?.webContents.send("update-stats", {
          replayName: this.loadedLiveReplayName,
        });
      }
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
    this.watcher = null;
    // fs.watch throws outright if the directory is gone, which is exactly the
    // case this runs in after a failed load.
    if (!directory || !fs.existsSync(directory)) return;
    this.watcher = fs.watch(
      directory,
      { recursive: true },
      (event, filename) => {
        if (filename && !this.isLoadingReplays()) {
          try {
            const filePath = path.join(directory, filename);
            const game = new SlippiGame(filePath);

            const winners = game.getWinners();
            if (winners.length > 0 && !this.ingestedLiveFiles.has(filePath)) {
              const metadata = game.getMetadata();
              const lastFrame = metadata.lastFrame;
              if (lastFrame <= 30 * 60) return;
              // filename can include subdirectories of directory, and on
              // Windows it comes back backslash-separated — hence path.basename
              // rather than splitting on "/". Getting this wrong means the
              // replay is stored under a name the import can never match, so it
              // is re-imported on every launch.
              if (
                this.ingestedLiveFiles.size >=
                ReplayLoadManager.MAX_INGESTED_LIVE_FILES
              ) {
                // Sets iterate in insertion order, so this drops the oldest.
                const oldest = this.ingestedLiveFiles.values().next().value;
                if (oldest !== undefined) this.ingestedLiveFiles.delete(oldest);
              }
              this.ingestedLiveFiles.add(filePath);
              this.beginLoadingReplayFile({
                path: filePath,
                name: path.basename(filename),
              });
            }

            const settings = game.getSettings();
            // Guarded rather than optional-chained on one line and not the
            // next: a null here threw into the bare catch below, and the game
            // was silently never detected.
            if (!settings?.players) return;
            const players = settings.players.map((player: any) => {
              return {
                connectCode: player.connectCode,
                name: player.displayName,
                characterId: (player.characterId || 0).toString(),
              };
            });
            // Stage ids are strings everywhere downstream (see the root
            // CLAUDE.md) — sending the raw number makes every stage comparison
            // in the renderer silently fail to match.
            const stageId = (settings.stageId ?? "").toString();
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
