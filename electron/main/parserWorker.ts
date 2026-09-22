import { utilityProcess, UtilityProcess } from "electron";
import { WORKER_ENTRY } from "./vite_constants";
import type { ParseResults, WorkerMessage } from "../worker/protocol";
import type { ReplayFileInfo } from "../../src/replayParsing";

let nextWorkerId = 1;

type ParserWorkerHandlers = {
  onResults: (worker: ParserWorker, results: ParseResults) => void;
  /** Called when the process dies without being retired, with whatever it still owed us. */
  onCrash: (worker: ParserWorker, lostFiles: ReplayFileInfo[]) => void;
};

/**
 * One `utilityProcess` running `electron/worker/replayParser.ts`: a Node process
 * with no Chromium behind it, which is the whole point of the pool.
 */
export class ParserWorker {
  readonly id = nextWorkerId++;
  private child: UtilityProcess;
  private isReady = false;
  private retired = false;
  /** Sent before the worker finished booting; flushed on "ready". */
  private pending: ReplayFileInfo[] | null = null;
  /** The batch currently being parsed, kept so a crash can requeue it. */
  private inFlight: ReplayFileInfo[] = [];

  constructor(private handlers: ParserWorkerHandlers) {
    this.child = utilityProcess.fork(WORKER_ENTRY, [], {
      serviceName: "melee-dex-replay-parser",
    });

    this.child.on("message", (message: WorkerMessage) => {
      if (message?.type === "ready") {
        this.isReady = true;
        if (this.pending) {
          const files = this.pending;
          this.pending = null;
          this.send(files);
        }
        return;
      }
      if (message?.type === "parsed") {
        this.inFlight = [];
        this.handlers.onResults(this, message);
      }
    });

    this.child.on("exit", () => {
      if (this.retired) return;
      const lost = [...this.inFlight, ...(this.pending ?? [])];
      this.inFlight = [];
      this.pending = null;
      this.retired = true;
      this.handlers.onCrash(this, lost);
    });
  }

  parse(files: ReplayFileInfo[]) {
    if (this.retired) return;
    if (!this.isReady) {
      this.pending = files;
      return;
    }
    this.send(files);
  }

  private send(files: ReplayFileInfo[]) {
    this.inFlight = files;
    this.child.postMessage({ type: "parse", files });
  }

  retire() {
    if (this.retired) return;
    this.retired = true;
    this.child.kill();
  }
}
