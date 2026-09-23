import path from "node:path";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeParserWorker } from "../helpers/fakeParserWorker";
import type { ReplayFileInfo } from "@/replayParsing";
import { makeReplay } from "../helpers/makeReplay";
import { ReplayLoadManager } from "../../electron/main/replayLoadManager";

/**
 * The worker pool, which is the most intricate code in the app and the part a
 * bug in is hardest to notice: replays go missing or get counted twice, and
 * nothing says so.
 *
 * Everything around the pool is faked — the workers, the renderer, the file
 * walk, the watcher — so the batching, the ack-driven backpressure and the
 * crash isolation are the code actually under test.
 */

const state = vi.hoisted(() => ({
  mainWindow: null as null | {
    isDestroyed: () => boolean;
    webContents: { send: (channel: string, payload?: unknown) => void };
  },
  replayFiles: [] as ReplayFileInfo[],
  readThrows: false,
  numberOfWorkers: 1,
  watchedDirectories: [] as string[],
  directoryExists: true,
  watchListener: null as
    | null
    | ((event: string, filename: string | null) => void),
  /** What the stubbed SlippiGame reports for the next file the watcher sees. */
  game: {
    winners: [{ playerIndex: 0 }] as unknown[],
    lastFrame: 9000,
    stageId: 31 as number | undefined,
    players: [
      { connectCode: "JAKE#193", displayName: "jakeyizle", characterId: 2 },
      { connectCode: "KENJ#707", displayName: "kenji", characterId: 9 },
    ] as unknown[],
    throws: false,
  },
}));

const sent = vi.hoisted(() => [] as { channel: string; payload?: unknown }[]);

vi.mock("../../electron/main/parserWorker", async () => {
  const { FakeParserWorker } = await import("../helpers/fakeParserWorker");
  return { ParserWorker: FakeParserWorker };
});

vi.mock("../../electron/main/utils", () => ({
  // A getter, because the manager reads `mainWindow` afresh on every send and
  // one of the cases under test is it having gone away.
  get mainWindow() {
    return state.mainWindow;
  },
  getReplayFiles: vi.fn(async () => {
    if (state.readThrows) throw new Error("ENOENT: replay directory is gone");
    return state.replayFiles;
  }),
  getNumberOfWorkers: vi.fn(() => state.numberOfWorkers),
}));

// The manager pulls SlippiGame through this for the live watcher only.
vi.mock("../../electron/main/vite_constants", () => ({
  require: () => ({
    SlippiGame: class {
      constructor() {
        if (state.game.throws) throw new Error("not a readable replay yet");
      }
      getWinners() {
        return state.game.winners;
      }
      getMetadata() {
        return { lastFrame: state.game.lastFrame };
      }
      getSettings() {
        return { stageId: state.game.stageId, players: state.game.players };
      }
    },
  }),
}));

vi.mock("node:fs", () => {
  const fs = {
    existsSync: vi.fn(() => state.directoryExists),
    watch: vi.fn(
      (
        directory: string,
        _options: unknown,
        listener: (event: string, filename: string | null) => void,
      ) => {
        state.watchedDirectories.push(directory);
        state.watchListener = listener;
        return { close: vi.fn() };
      },
    ),
  };
  return { default: fs, ...fs };
});

const files = (count: number, prefix = "Game"): ReplayFileInfo[] =>
  Array.from({ length: count }, (_unused, index) => ({
    name: `${prefix}_${index}.slp`,
    path: `C:/Slippi/${prefix}_${index}.slp`,
  }));

/**
 * A fresh singleton per test — the manager keeps one for the app's lifetime.
 *
 * The private static is cleared rather than resetting the module registry:
 * `vi.resetModules()` would hand the mock factory a second copy of the fake
 * worker module, and the instances the test inspects would not be the ones the
 * pool built.
 */
const freshManager = async () => {
  (ReplayLoadManager as unknown as { instance: unknown }).instance = null;
  return ReplayLoadManager.getInstance();
};

const workers = () => FakeParserWorker.instances;
const channelsSent = () => sent.map((message) => message.channel);
const lastSent = (channel: string) =>
  [...sent].reverse().find((message) => message.channel === channel)?.payload as any;

beforeEach(() => {
  FakeParserWorker.reset();
  sent.length = 0;
  state.mainWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, payload) => sent.push({ channel, payload }),
    },
  };
  state.replayFiles = [];
  state.readThrows = false;
  state.numberOfWorkers = 1;
  state.watchedDirectories = [];
  state.directoryExists = true;
  state.watchListener = null;
  state.game = {
    winners: [{ playerIndex: 0 }],
    lastFrame: 9000,
    stageId: 31,
    players: [
      { connectCode: "JAKE#193", displayName: "jakeyizle", characterId: 2 },
      { connectCode: "KENJ#707", displayName: "kenji", characterId: 9 },
    ],
    throws: false,
  };
});

describe("beginLoadingReplayDirectory — whether an import starts", () => {
  // The renderer raises its progress bar on the strength of this answer and has
  // no other way to take it down, so a false positive leaves it up forever.
  it("declines without a directory", async () => {
    const manager = await freshManager();

    expect(await manager.beginLoadingReplayDirectory(undefined, [])).toBe(false);
    expect(workers()).toHaveLength(0);
  });

  it("declines while an import is already running", async () => {
    const manager = await freshManager();
    state.replayFiles = files(3);

    expect(await manager.beginLoadingReplayDirectory("C:/Slippi", [])).toBe(true);
    expect(await manager.beginLoadingReplayDirectory("C:/Slippi", [])).toBe(false);
    expect(workers()).toHaveLength(1);
  });

  // Usually the directory has been moved or deleted. The load still has to end,
  // so the renderer drops its progress bar and builds stats from what it has.
  it("declines and ends the load when the directory cannot be read", async () => {
    const manager = await freshManager();
    state.readThrows = true;

    expect(await manager.beginLoadingReplayDirectory("C:/Slippi", [])).toBe(false);
    expect(channelsSent()).toContain("end-loading-replays");
  });

  // Without this the renderer drops its progress bar and shows "Listening for
  // Games" over a stale library — healthy-looking, and importing nothing.
  it("tells the renderer which directory it could not read", async () => {
    const manager = await freshManager();
    state.readThrows = true;

    await manager.beginLoadingReplayDirectory("D:/Gone", []);

    expect(lastSent("replay-directory-unreadable")).toEqual({
      replayDirectory: "D:/Gone",
    });
  });

  it("says nothing about the directory when the read succeeds", async () => {
    const manager = await freshManager();
    state.replayFiles = files(3);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);

    expect(channelsSent()).not.toContain("replay-directory-unreadable");
  });

  it("declines and ends the load when there is nothing new on disk", async () => {
    const manager = await freshManager();
    state.replayFiles = files(2);

    const started = await manager.beginLoadingReplayDirectory("C:/Slippi", [
      "Game_0.slp",
      "Game_1.slp",
    ]);

    expect(started).toBe(false);
    expect(channelsSent()).toContain("end-loading-replays");
    expect(workers()).toHaveLength(0);
  });

  it("starts when there is work, and only parses what it does not have", async () => {
    const manager = await freshManager();
    state.replayFiles = files(3);

    expect(
      await manager.beginLoadingReplayDirectory("C:/Slippi", ["Game_1.slp"]),
    ).toBe(true);
    expect(workers()[0].batches[0].map((file) => file.name)).toEqual([
      "Game_0.slp",
      "Game_2.slp",
    ]);
  });

  // Known names include the rejected ones, so a replay that failed to parse is
  // not retried on every launch.
  it("skips replays already filed as bad", async () => {
    const manager = await freshManager();
    state.replayFiles = files(2);

    const started = await manager.beginLoadingReplayDirectory("C:/Slippi", [
      "Game_0.slp",
      "Game_1.slp",
    ]);

    expect(started).toBe(false);
  });
});

describe("batching and backpressure", () => {
  it("hands each worker one batch at a time, capped at the batch size", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);

    expect(workers()).toHaveLength(1);
    expect(workers()[0].batches).toHaveLength(1);
    expect(workers()[0].batches[0]).toHaveLength(10);
  });

  it("spawns the number of workers it was told to", async () => {
    const manager = await freshManager();
    state.replayFiles = files(40);
    state.numberOfWorkers = 3;

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);

    expect(workers()).toHaveLength(3);
    // Three distinct batches, no file handed out twice.
    const handedOut = workers().flatMap((worker) => worker.batches[0]);
    expect(new Set(handedOut.map((file) => file.name)).size).toBe(30);
  });

  // The ack is the backpressure: a worker gets nothing more until the renderer
  // confirms the last batch was committed. Without it the pool runs ahead of
  // IndexedDB and the writes queue up unboundedly.
  it("holds the next batch until the renderer acks the last one", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const worker = workers()[0];
    worker.finishBatch({ replays: [makeReplay()] });

    expect(worker.batches).toHaveLength(1);

    const { token } = lastSent("insert-parsed-replays");
    manager.onReplaysInserted({ token, count: 10 });

    expect(worker.batches).toHaveLength(2);
  });

  it("gives every batch its own token", async () => {
    const manager = await freshManager();
    state.replayFiles = files(30);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const worker = workers()[0];

    const tokens: number[] = [];
    for (let i = 0; i < 3; i++) {
      worker.finishBatch({ replays: [makeReplay()] });
      const { token } = lastSent("insert-parsed-replays");
      tokens.push(token);
      manager.onReplaysInserted({ token, count: 10 });
    }

    expect(new Set(tokens).size).toBe(3);
  });

  it("passes the parsed replays and the rejected files to the renderer", async () => {
    const manager = await freshManager();
    state.replayFiles = files(2);
    const replay = makeReplay();

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    workers()[0].finishBatch({
      replays: [replay],
      badReplays: [{ name: "Bad.slp", path: "C:/Slippi/Bad.slp" }],
    });

    expect(lastSent("insert-parsed-replays")).toMatchObject({
      replays: [replay],
      badReplays: [{ name: "Bad.slp", path: "C:/Slippi/Bad.slp" }],
      count: 2,
    });
  });

  it("reports progress as batches are committed", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    workers()[0].finishBatch({ replays: [makeReplay()] });
    manager.onReplaysInserted({
      token: lastSent("insert-parsed-replays").token,
      count: 10,
    });

    expect(lastSent("update-replay-load-progress")).toMatchObject({
      totalReplaysToLoad: 25,
      currentReplaysLoaded: 10,
    });
  });

  // Nowhere to store them, so there is no ack coming. Stalling the worker on
  // one would wedge the pool for the rest of the run.
  it("keeps the pool moving when the window has gone away", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    state.mainWindow = null;
    workers()[0].finishBatch({ replays: [makeReplay()] });

    expect(workers()[0].batches).toHaveLength(2);
  });
});

describe("a worker that crashes", () => {
  it("is replaced so the remaining work still gets done", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    workers()[0].crash();

    expect(workers()).toHaveLength(2);
    expect(workers()[1].batches[0]).toHaveLength(1);
  });

  // The batch it died on is re-parsed one file at a time, so the file that
  // killed it can be identified rather than taking the other nine with it.
  it("has its batch re-parsed one file at a time", async () => {
    const manager = await freshManager();
    state.replayFiles = files(10);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const lost = workers()[0].batches[0];
    workers()[0].crash();

    const replacement = workers()[1];
    expect(replacement.batches[0]).toHaveLength(1);
    expect(replacement.batches[0][0]).toEqual(lost[0]);
  });

  // Already isolated, so this one file is what killed the process. Filing it as
  // bad is both the right answer and what stops the retry loop.
  it("files the single file it was isolating as a bad replay", async () => {
    const manager = await freshManager();
    state.replayFiles = files(1);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    workers()[0].crash();

    expect(lastSent("insert-parsed-replays")).toMatchObject({
      replays: [],
      badReplays: [{ name: "Game_0.slp" }],
    });
  });

  it("does not loop forever on the file that kills workers", async () => {
    const manager = await freshManager();
    state.replayFiles = files(1);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    workers()[0].crash();
    manager.onReplaysInserted({
      token: lastSent("insert-parsed-replays").token,
      count: 1,
    });

    expect(channelsSent()).toContain("end-loading-replays");
  });

  // Its batch is already awaiting an ack. Dispatching to a dead process would
  // splice the next files off the queue and hand them to something that
  // silently refuses them — losing them for the run. A dead worker accepting
  // no work is exactly why the loss is invisible, so the assertion is that
  // every file reached *some* worker, not that this one got nothing.
  it("does not lose the queued files when its ack arrives", async () => {
    const manager = await freshManager();
    state.replayFiles = files(30);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const worker = workers()[0];
    worker.finishBatch({ replays: [makeReplay()] });
    const { token } = lastSent("insert-parsed-replays");

    worker.crash();
    manager.onReplaysInserted({ token, count: 10 });

    // Drain whatever is left through the replacement workers.
    for (let guard = 0; guard < 50; guard++) {
      const busy = workers().filter(
        (candidate) => !candidate.isRetired && candidate.inFlight,
      );
      if (busy.length === 0) break;
      for (const candidate of busy) {
        candidate.finishBatch({ replays: [makeReplay()] });
        const payload = lastSent("insert-parsed-replays");
        manager.onReplaysInserted({
          token: payload.token,
          count: payload.count,
        });
      }
    }

    // The fake refuses work once it has died, so a batch handed to a dead
    // worker appears in nobody's list.
    const parsed = new Set(
      workers().flatMap((candidate) =>
        candidate.batches.flat().map((file) => file.name),
      ),
    );
    expect(parsed.size).toBe(30);
  });
});

describe("finishing a load", () => {
  const drain = async (manager: any) => {
    // Answer and ack until every worker has retired.
    for (let guard = 0; guard < 50; guard++) {
      const busy = workers().filter(
        (worker) => !worker.isRetired && worker.inFlight,
      );
      if (busy.length === 0) break;
      for (const worker of busy) {
        worker.finishBatch({ replays: [makeReplay()] });
        const payload = lastSent("insert-parsed-replays");
        manager.onReplaysInserted({ token: payload.token, count: payload.count });
      }
    }
  };

  it("tells the renderer the import is over", async () => {
    const manager = await freshManager();
    state.replayFiles = files(15);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    await drain(manager);

    expect(channelsSent()).toContain("end-loading-replays");
    expect(workers().every((worker) => worker.isRetired)).toBe(true);
  });

  it("starts watching the directory again once the import is done", async () => {
    const manager = await freshManager();
    state.replayFiles = files(5);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    await drain(manager);

    expect(state.watchedDirectories).toContain("C:/Slippi");
  });

  it("does not try to watch a directory that is gone", async () => {
    const manager = await freshManager();
    state.readThrows = true;
    state.directoryExists = false;

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);

    expect(state.watchedDirectories).toEqual([]);
  });
});

describe("a single live replay", () => {
  it("names the replay it stored so the renderer can fold it in", async () => {
    const manager = await freshManager();

    await manager.beginLoadingReplayFile({
      name: "Live.slp",
      path: "C:/Slippi/Live.slp",
    });
    const replay = makeReplay({ name: "Live.slp" });
    workers()[0].finishBatch({ replays: [replay] });
    manager.onReplaysInserted({
      token: lastSent("insert-parsed-replays").token,
      count: 1,
    });

    expect(lastSent("update-stats")).toEqual({ replayName: "Live.slp" });
    expect(channelsSent()).not.toContain("end-loading-replays");
  });

  // A rejected live game — a match against a CPU, a parse failure — stores
  // nothing. Announcing it would make the renderer fold its *previous* replay
  // into the stats a second time.
  it("says nothing when the replay was rejected", async () => {
    const manager = await freshManager();

    await manager.beginLoadingReplayFile({
      name: "Live.slp",
      path: "C:/Slippi/Live.slp",
    });
    workers()[0].finishBatch({
      replays: [],
      badReplays: [{ name: "Live.slp", path: "C:/Slippi/Live.slp" }],
    });
    manager.onReplaysInserted({
      token: lastSent("insert-parsed-replays").token,
      count: 1,
    });

    expect(channelsSent()).not.toContain("update-stats");
  });

  // The progress bar is for the initial import. Raising it for every finished
  // game would flicker the dashboard away mid-session.
  it("does not report progress", async () => {
    const manager = await freshManager();

    await manager.beginLoadingReplayFile({
      name: "Live.slp",
      path: "C:/Slippi/Live.slp",
    });
    workers()[0].finishBatch({ replays: [makeReplay({ name: "Live.slp" })] });
    manager.onReplaysInserted({
      token: lastSent("insert-parsed-replays").token,
      count: 1,
    });

    expect(channelsSent()).not.toContain("update-replay-load-progress");
  });

  it("is declined while a directory import is running", async () => {
    const manager = await freshManager();
    state.replayFiles = files(25);

    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const workerCount = workers().length;
    await manager.beginLoadingReplayFile({
      name: "Live.slp",
      path: "C:/Slippi/Live.slp",
    });

    expect(workers()).toHaveLength(workerCount);
  });
});

describe("the live watcher", () => {
  /** Attaches the watcher and hands back the callback fs.watch was given. */
  const watch = async () => {
    const manager = await freshManager();
    manager.listenForReplayFile("C:/Slippi");
    return { manager, fire: state.watchListener! };
  };

  it("announces a game it sees in the directory", async () => {
    const { fire } = await watch();

    fire("rename", "Game_Live.slp");

    expect(lastSent("live-replay-loaded")).toMatchObject({
      filename: "Game_Live.slp",
      players: [
        { connectCode: "JAKE#193", name: "jakeyizle", characterId: "2" },
        { connectCode: "KENJ#707", name: "kenji", characterId: "9" },
      ],
    });
  });

  // Character and stage ids are strings everywhere downstream. Sending the raw
  // number makes every stage comparison in the renderer silently fail to match,
  // so the stage row reads "first time here" for a stage played a hundred times.
  it("sends the stage id as a string, like everything else in the app", async () => {
    const { fire } = await watch();

    fire("rename", "Game_Live.slp");

    const payload = lastSent("live-replay-loaded");
    expect(payload.stageId).toBe("31");
    expect(typeof payload.stageId).toBe("string");
    for (const player of payload.players) {
      expect(typeof player.characterId).toBe("string");
    }
  });

  it("copes with a replay that names no stage", async () => {
    const { fire } = await watch();
    state.game.stageId = undefined;

    fire("rename", "Game_Live.slp");

    expect(lastSent("live-replay-loaded").stageId).toBe("");
  });

  it("queues a finished game for parsing", async () => {
    const { fire } = await watch();

    fire("rename", "Game_Live.slp");

    expect(workers()).toHaveLength(1);
    expect(workers()[0].batches[0]).toEqual([
      {
        name: "Game_Live.slp",
        // Joined, not concatenated: fs.watch hands back a path relative to the
        // watched directory, separator and all.
        path: path.join("C:/Slippi", "Game_Live.slp"),
      },
    ]);
  });

  // fs.watch keeps firing for a finished replay, and the watcher is re-attached
  // after every load. Without the guard the same game is ingested repeatedly
  // and counted into the stats each time.
  it("ingests a given file only once however often it fires", async () => {
    const { fire } = await watch();

    fire("rename", "Game_Live.slp");
    fire("change", "Game_Live.slp");
    fire("change", "Game_Live.slp");

    expect(workers()).toHaveLength(1);
  });

  it("ignores a game too short to be real", async () => {
    const { fire } = await watch();
    state.game.lastFrame = 30 * 60;

    fire("rename", "Game_Live.slp");

    expect(workers()).toHaveLength(0);
  });

  it("ignores a game that has not finished yet", async () => {
    const { fire } = await watch();
    state.game.winners = [];

    fire("rename", "Game_Live.slp");

    expect(workers()).toHaveLength(0);
  });

  // fs.watch fires on partial writes, so a file that cannot be read yet is the
  // normal case, not an error.
  it("stays quiet when the file cannot be parsed yet", async () => {
    const { fire } = await watch();
    state.game.throws = true;

    expect(() => fire("rename", "Game_Live.slp")).not.toThrow();
    expect(channelsSent()).not.toContain("live-replay-loaded");
  });

  it("ignores a replay whose settings cannot be read", async () => {
    const { fire } = await watch();
    state.game.players = null as unknown as unknown[];

    expect(() => fire("rename", "Game_Live.slp")).not.toThrow();
    expect(channelsSent()).not.toContain("live-replay-loaded");
  });

  // The set only exists to spot repeats, which arrive within moments of each
  // other. It used to keep every path a session ever saw, so it grew without
  // limit for anyone who left the app open.
  //
  // Games have to be played through one at a time: the watcher stands down
  // while a load is in flight, so firing 250 events back to back would only
  // ever ingest the first.
  it("does not grow without limit over a long session", async () => {
    const { manager } = await watch();

    for (let index = 0; index < 210; index++) {
      state.watchListener!("rename", `Game_${index}.slp`);
      const worker = workers().at(-1)!;
      if (!worker.inFlight) continue;
      worker.finishBatch({ replays: [makeReplay()] });
      const payload = lastSent("insert-parsed-replays");
      manager.onReplaysInserted({
        token: payload.token,
        count: payload.count,
      });
    }

    const ingested = (
      manager as unknown as { ingestedLiveFiles: Set<string> }
    ).ingestedLiveFiles;

    expect(ingested.size).toBeLessThanOrEqual(200);
    // Still doing its job for anything recent, which is all it is for.
    expect(ingested.has(path.join("C:/Slippi", "Game_209.slp"))).toBe(true);
    expect(ingested.has(path.join("C:/Slippi", "Game_000.slp"))).toBe(false);
  });

  it("ignores an event with no filename", async () => {
    const { fire } = await watch();

    fire("rename", null);

    expect(channelsSent()).not.toContain("live-replay-loaded");
  });

  // A file landing mid-import belongs to that import, and the watcher must not
  // race it into a second parse.
  it("stands down while an import is running", async () => {
    const manager = await freshManager();
    manager.listenForReplayFile("C:/Slippi");
    const fire = state.watchListener!;
    state.replayFiles = files(25);
    await manager.beginLoadingReplayDirectory("C:/Slippi", []);
    const workerCount = workers().length;

    fire("rename", "Game_Live.slp");

    expect(workers()).toHaveLength(workerCount);
    expect(channelsSent()).not.toContain("live-replay-loaded");
  });
});
