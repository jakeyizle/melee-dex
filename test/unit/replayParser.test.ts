import path from "node:path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlippiGame } from "@slippi/slippi-js/node";
import type { ParseResults } from "../../electron/worker/protocol";
import type { ReplayFileInfo } from "@/replayParsing";

/**
 * The parser worker entry, which normally only ever runs inside a
 * `utilityProcess`. Two things make it awkward to reach, and both are faked
 * here so the module itself is the code under test:
 *
 * - `process.parentPort` exists only in a utilityProcess, and the module talks
 *   to it at import time.
 * - `slippi-js` is CJS and pulled in through `createRequire`, because it is
 *   externalised from the bundle.
 *
 * Everything else is real: these are the actual `.slp` files from `testdata/`,
 * parsed by the actual `SlippiGame`.
 */

const parentPort = vi.hoisted(() => ({
  on: vi.fn(),
  postMessage: vi.fn(),
}));

vi.mock("node:module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:module")>();
  return {
    ...actual,
    // The worker asks for exactly one module, and it gets the real one.
    createRequire: () => (id: string) => {
      if (id === "@slippi/slippi-js/node") return { SlippiGame };
      throw new Error(`unexpected require: ${id}`);
    },
  };
});

// Must be in place before the module is imported: it posts "ready" on load.
(process as unknown as { parentPort: typeof parentPort }).parentPort =
  parentPort;

await import("../../electron/worker/replayParser");

/**
 * Whatever the module did while it was being evaluated, snapshotted here rather
 * than read from the mocks inside a test: vitest clears every mock's recorded
 * history before each test, so history from import time does not survive to be
 * asserted on.
 */
const messagesPostedOnLoad = parentPort.postMessage.mock.calls.map(
  ([message]) => message,
);
const listenersAttachedOnLoad = parentPort.on.mock.calls.map(
  ([channel, listener]) => ({ channel, listener }),
);

const TESTDATA = path.resolve(__dirname, "../../testdata");
const file = (name: string): ReplayFileInfo => ({
  name,
  path: path.join(TESTDATA, name),
});

// The two smallest files in testdata, so this stays fast: one valid, and the
// 24-frame one the parser rejects as too short.
const VALID = file("Game_20250421T224653.slp");
const TOO_SHORT = file("Game_20250422T214211.slp");
const MISSING = { name: "Gone.slp", path: path.join(TESTDATA, "Gone.slp") };

/** The listener the worker registered at import. */
const handleMessage = () =>
  listenersAttachedOnLoad.find(({ channel }) => channel === "message")!
    .listener as (event: { data: unknown }) => void;

const parse = (files: ReplayFileInfo[]): ParseResults => {
  parentPort.postMessage.mockClear();
  handleMessage()({ data: { type: "parse", files } });
  return parentPort.postMessage.mock.calls.at(-1)![0] as ParseResults;
};

beforeEach(() => {
  parentPort.postMessage.mockClear();
});

describe("the worker handshake", () => {
  // ESM entry points finish evaluating asynchronously, so main must not send
  // work until this lands — the pool holds a worker's first batch until it does.
  it("announces itself as ready while it is still loading", () => {
    expect(messagesPostedOnLoad).toEqual([{ type: "ready" }]);
  });

  it("attaches its listener before saying it is ready", () => {
    expect(listenersAttachedOnLoad).toEqual([
      { channel: "message", listener: expect.any(Function) },
    ]);
    // Nothing else is posted on load, so a batch arriving the instant "ready"
    // is seen already has somewhere to land.
    expect(messagesPostedOnLoad).toHaveLength(1);
  });

  it("ignores a message that is not a parse request", () => {
    handleMessage()({ data: { type: "something-else" } });
    handleMessage()({ data: undefined });
    handleMessage()({ data: null });

    expect(parentPort.postMessage).not.toHaveBeenCalled();
  });
});

describe("parsing a batch", () => {
  it("returns a parsed replay for a good file", () => {
    const results = parse([VALID]);

    expect(results.type).toBe("parsed");
    expect(results.badReplays).toEqual([]);
    expect(results.replays).toHaveLength(1);
    expect(results.replays[0]).toMatchObject({
      name: VALID.name,
      winnerConnectCode: expect.stringContaining("#"),
    });
  });

  it("files a replay the parser rejects as bad", () => {
    const results = parse([TOO_SHORT]);

    expect(results.replays).toEqual([]);
    // The reason travels with it, so the app can say *why* later.
    expect(results.badReplays).toEqual([
      { name: TOO_SHORT.name, path: TOO_SHORT.path, reason: "too-short" },
    ]);
  });

  // The bare try/catch is deliberate: anything that throws is a bad replay, and
  // the rest of the batch still has to come back.
  it("files a file it cannot even open as bad, without losing the batch", () => {
    const results = parse([MISSING, VALID]);

    expect(results.badReplays).toEqual([
      { name: MISSING.name, path: MISSING.path, reason: "unreadable" },
    ]);
    expect(results.replays).toHaveLength(1);
    expect(results.replays[0].name).toBe(VALID.name);
  });

  // `count` is what the pool uses to advance the progress bar, so it has to be
  // the number of files consumed — not the number that parsed.
  it("counts every file it was given, however each one turned out", () => {
    const results = parse([VALID, TOO_SHORT, MISSING]);

    expect(results.count).toBe(3);
    expect(results.replays.length + results.badReplays.length).toBe(3);
  });

  it("returns an empty result for an empty batch", () => {
    const results = parse([]);

    expect(results).toEqual({
      type: "parsed",
      replays: [],
      badReplays: [],
      count: 0,
    });
  });

  it("answers every batch it is sent", () => {
    parse([VALID]);
    const second = parse([TOO_SHORT]);

    expect(second.type).toBe("parsed");
    expect(parentPort.postMessage).toHaveBeenCalledTimes(1);
  });

  // The worker returns plain objects so they can be structured-cloned across
  // the process boundary. Anything else silently fails to send.
  it("returns something that can cross a process boundary", () => {
    const results = parse([VALID, TOO_SHORT]);

    expect(() => structuredClone(results)).not.toThrow();
  });
});
