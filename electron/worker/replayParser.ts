import { createRequire } from "node:module";
import { parseGameToReplay, ReplayFileInfo } from "../../src/replayParsing";
import type { Replay } from "../../src/db/replays";
import type { ParseRequest, ParseResults } from "./protocol";

// slippi-js is CJS and externalized from the bundle, same as in the main process.
const require = createRequire(import.meta.url);
const { SlippiGame } = require("@slippi/slippi-js");

// This runs in a utilityProcess: a plain Node context with no Chromium and no
// IndexedDB. It only parses — the parsed `Replay` objects go back to main, which
// forwards them to the main renderer for storage.

const parseBatch = (files: ReplayFileInfo[]): ParseResults => {
  const replays: Replay[] = [];
  const badReplays: ReplayFileInfo[] = [];

  for (const file of files) {
    try {
      const result = parseGameToReplay(new SlippiGame(file.path), file);
      if (result.ok) {
        replays.push(result.replay);
      } else {
        badReplays.push({ name: file.name, path: file.path });
      }
    } catch (_e) {
      badReplays.push({ name: file.name, path: file.path });
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
