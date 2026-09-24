import { createRequire } from "node:module";
import {
  parseGameToReplay,
  ReplayFileInfo,
  RejectedReplay,
} from "../../src/replayParsing";
import type { Replay } from "../../src/db/replays";
import type { ParseRequest, ParseResults } from "./protocol";
import { readFinalStocks } from "./tailReader";

// slippi-js is CJS and externalized from the bundle, same as in the main process.
const require = createRequire(import.meta.url);
const { SlippiGame } = require("@slippi/slippi-js/node");

// This runs in a utilityProcess: a plain Node context with no Chromium and no
// IndexedDB. It only parses — the parsed `Replay` objects go back to main, which
// forwards them to the main renderer for storage.

const parseBatch = (files: ReplayFileInfo[]): ParseResults => {
  const replays: Replay[] = [];
  const badReplays: RejectedReplay[] = [];

  for (const file of files) {
    try {
      // The tail reader is only consulted when slippi-js cannot name a winner,
      // so this thunk usually goes uncalled — see `tryGetWinner`.
      const result = parseGameToReplay(new SlippiGame(file.path), file, () =>
        readFinalStocks(file.path),
      );
      if (result.ok) {
        replays.push(result.replay);
      } else {
        badReplays.push({ ...file, reason: result.reason });
      }
    } catch (_e) {
      // Anything that throws is unreadable: a partial write, a corrupt file, or
      // something that is not a replay at all.
      badReplays.push({ ...file, reason: "unreadable" });
    }
  }

  return { type: "parsed", replays, badReplays, count: files.length };
};

process.parentPort.on("message", (event) => {
  const message = event.data as ParseRequest;
  if (message?.type !== "parse") return;
  process.parentPort.postMessage(parseBatch(message.files));
});

// ESM entry points finish evaluating asynchronously, so main must not send work
// until this lands — see `ParserWorker` in electron/main/parserWorker.ts.
process.parentPort.postMessage({ type: "ready" });
