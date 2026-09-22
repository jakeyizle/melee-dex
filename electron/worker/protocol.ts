import type { Replay } from "../../src/db/replays";
import type { ReplayFileInfo } from "../../src/replayParsing";

/**
 * The message contract between the main process and the `utilityProcess` parser
 * workers (`electron/worker/replayParser.ts`). Types only — this module must stay
 * importable from both sides without pulling in any runtime.
 */

/** How many files main hands a worker per round trip. */
export const PARSE_BATCH_SIZE = 10;

export type ParseRequest = {
  type: "parse";
  files: ReplayFileInfo[];
};

/** Worker → main once its message listener is attached. */
export type WorkerReady = { type: "ready" };

/** Worker → main with the results of exactly one `ParseRequest`. */
export type ParseResults = {
  type: "parsed";
  replays: Replay[];
  badReplays: ReplayFileInfo[];
  /** Files consumed, i.e. `replays.length + badReplays.length`. */
  count: number;
};

export type WorkerMessage = WorkerReady | ParseResults;
