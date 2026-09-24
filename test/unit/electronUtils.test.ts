import { describe, it, expect, beforeEach, vi } from "vitest";

const state = vi.hoisted(() => ({
  cores: 8,
  entries: [] as {
    name: string;
    parentPath: string;
    isDirectory: () => boolean;
  }[],
}));

vi.mock("node:os", () => {
  const os = {
    cpus: () => Array.from({ length: state.cores }, () => ({})),
    release: () => "10.0.19045",
  };
  return { default: os, ...os };
});

vi.mock("node:fs", () => {
  const fs = {
    promises: { readdir: vi.fn(async () => state.entries) },
    existsSync: vi.fn(() => true),
    watch: vi.fn(() => ({ close: vi.fn() })),
  };
  return { default: fs, ...fs };
});

// `createMainWindow` is the only thing in this module that touches Electron.
vi.mock("electron", () => ({
  BrowserWindow: class {},
  app: { quit: vi.fn(), getVersion: () => "0.0.0" },
  shell: { openExternal: vi.fn() },
}));

vi.mock("../../electron/main/vite_constants", () => ({
  require: () => ({}),
  PRELOAD: "preload.mjs",
  VITE_DEV_SERVER_URL: undefined,
  INDEX_HTML: "index.html",
  MAIN_DIST: "dist-electron",
  RENDERER_DIST: "dist",
  WORKER_ENTRY: "replayParser.js",
}));

const { getReplayFiles, getNumberOfWorkers } =
  await import("../../electron/main/utils");

const entry = (
  name: string,
  parentPath = "C:/Slippi",
  isDirectory = false,
) => ({
  name,
  parentPath,
  isDirectory: () => isDirectory,
});

beforeEach(() => {
  state.cores = 8;
  state.entries = [];
});

describe("getReplayFiles", () => {
  it("returns nothing when there is no directory", async () => {
    expect(await getReplayFiles(undefined)).toEqual([]);
  });

  it("returns every .slp with the path it was found at", async () => {
    state.entries = [entry("Game_1.slp"), entry("Game_2.slp")];

    expect(await getReplayFiles("C:/Slippi")).toEqual([
      { name: "Game_1.slp", path: "C:\\Slippi\\Game_1.slp" },
      { name: "Game_2.slp", path: "C:\\Slippi\\Game_2.slp" },
    ]);
  });

  // `parentPath` is the directory the entry was found in, which is what makes
  // replays kept in dated subfolders — how Slippi stores them — work at all.
  it("builds the path from the folder each file was found in", async () => {
    state.entries = [entry("Game_1.slp", "C:/Slippi/2025-04")];

    const [file] = await getReplayFiles("C:/Slippi");

    expect(file.path).toBe("C:\\Slippi\\2025-04\\Game_1.slp");
  });

  it("ignores directories", async () => {
    state.entries = [entry("2025-04", "C:/Slippi", true), entry("Game_1.slp")];

    expect(await getReplayFiles("C:/Slippi")).toHaveLength(1);
  });

  // Deliberate: `.slp.old` files parse fine but are Slippi's own backups, and
  // importing them would double-count games.
  it("does not match .slp.old backups or anything else", async () => {
    state.entries = [
      entry("Game_1.slp.old"),
      entry("notes.txt"),
      entry("Game_2.slp"),
      entry(".slp"),
    ];

    expect(
      (await getReplayFiles("C:/Slippi")).map((file) => file.name),
    ).toEqual(["Game_2.slp", ".slp"]);
  });

  it("returns nothing for an empty directory", async () => {
    expect(await getReplayFiles("C:/Slippi")).toEqual([]);
  });
});

describe("getNumberOfWorkers", () => {
  /**
   * `NUM_CORES` is read once when the module loads — correct, since the core
   * count cannot change under a running app, but it means a different machine
   * has to be simulated by reloading the module.
   */
  const withCores = async (cores: number) => {
    state.cores = cores;
    vi.resetModules();
    const utils = await import("../../electron/main/utils");
    return utils.getNumberOfWorkers;
  };

  // The cap is memory's call, not the CPU's: each worker's peak footprint is
  // the parsed frame data, and throughput knees long before memory does.
  it("never exceeds the hard cap of six, however many cores there are", async () => {
    const workersFor = await withCores(32);

    expect(workersFor(1000)).toBe(6);
  });

  it("leaves a core free for everything else", async () => {
    const workersFor = await withCores(4);

    expect(workersFor(1000)).toBe(3);
  });

  // No point forking a second process for a batch the first one will take
  // whole — a worker costs ~575ms to fork and ~200MB while alive.
  it("forks no more workers than there are batches of work", async () => {
    const workersFor = await withCores(32);

    expect(workersFor(1)).toBe(1);
    expect(workersFor(10)).toBe(1);
    expect(workersFor(11)).toBe(2);
    expect(workersFor(25)).toBe(3);
  });

  it("always returns at least one worker", async () => {
    const workersFor = await withCores(1);

    expect(workersFor(1000)).toBe(1);
    expect(workersFor(0)).toBe(1);
  });
});
