import type { ReplayFileInfo } from "../../src/replayParsing";
import type { ParseResults } from "../../electron/worker/protocol";
import type { Replay } from "../../src/db/replays";

type Handlers = {
  onResults: (worker: FakeParserWorker, results: ParseResults) => void;
  onCrash: (worker: FakeParserWorker, lostFiles: ReplayFileInfo[]) => void;
};

/**
 * Stands in for a `utilityProcess` parser worker.
 *
 * The real one forks a Node process; everything the pool cares about is the
 * handshake around it — which files it was handed, what it hands back, and
 * whether it died still owing work. That is what this exposes, so tests drive
 * the pool rather than the parser.
 */
export class FakeParserWorker {
  /** Every worker the pool has constructed, newest last. */
  static instances: FakeParserWorker[] = [];

  static reset() {
    FakeParserWorker.instances = [];
  }

  /** The batch it is holding, or null once it has answered or been retired. */
  inFlight: ReplayFileInfo[] | null = null;
  /** Every batch it was ever handed, in order. */
  batches: ReplayFileInfo[][] = [];
  isRetired = false;

  constructor(private handlers: Handlers) {
    FakeParserWorker.instances.push(this);
  }

  parse(files: ReplayFileInfo[]) {
    if (this.isRetired) return;
    this.inFlight = files;
    this.batches.push(files);
  }

  retire() {
    this.isRetired = true;
    this.inFlight = null;
  }

  /** Answers the batch it is holding: everything parsed unless told otherwise. */
  finishBatch({
    replays = [],
    badReplays,
  }: { replays?: Replay[]; badReplays?: ReplayFileInfo[] } = {}) {
    const files = this.inFlight ?? [];
    const bad = badReplays ?? (replays.length > 0 ? [] : files);
    this.inFlight = null;
    this.handlers.onResults(this, {
      type: "parsed",
      replays,
      badReplays: bad,
      count: replays.length + bad.length,
    });
  }

  /** Dies holding its batch, the way a parse that runs the process out of memory does. */
  crash() {
    const lost = this.inFlight ?? [];
    this.inFlight = null;
    this.isRetired = true;
    this.handlers.onCrash(this, lost);
  }
}
