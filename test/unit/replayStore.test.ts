import { describe, it, expect, beforeEach, vi } from "vitest";
import { installFakeIpcRenderer, FakeIpcRenderer } from "../helpers/fakeIpcRenderer";
import { makeMatch, USER, OPPONENT } from "../helpers/makeReplay";
import { buildStats } from "@/utils/statUtils";

// The store reads window.ipcRenderer when its listeners are wired, so the fake
// bridge has to exist before the module is imported.
const ipcRenderer: FakeIpcRenderer = installFakeIpcRenderer();

// Mocked at the module boundary: these are the store's two collaborators.
// Everything inside them is covered by replayRepository.test.ts / settings.test.ts.
vi.mock("@/db/replays", () => ({
  selectAllReplayNames: vi.fn(async () => ["Existing.slp"]),
  selectReplayCount: vi.fn(async () => 12),
  selectBadReplayCount: vi.fn(async () => 3),
  getMostCommonUser: vi.fn(async () => USER),
  determineUserBasedOnLiveGame: vi.fn(async () => USER),
  attemptGetUser: vi.fn(async () => USER),
  selectReplay: vi.fn(async () => null),
  insertReplays: vi.fn(async () => {}),
  insertBadReplays: vi.fn(async () => {}),
  executeCallbackOnEachReplay: vi.fn(async () => {}),
}));

vi.mock("@/db/settings", () => ({
  updateUsernameIfEmpty: vi.fn(
    async (suggestUsername: () => Promise<string>) => await suggestUsername(),
  ),
}));

const db = await import("@/db/replays");
const { useReplayStore, setupReplayStoreIpcListeners } = await import(
  "@/replayStore"
);

const initialState = useReplayStore.getState();

setupReplayStoreIpcListeners();

const liveGameArgs = {
  filename: "Game_Live.slp",
  stageId: "31",
  players: [
    { connectCode: USER, name: "USER", characterId: "0" },
    { connectCode: OPPONENT, name: "OPPO", characterId: "9" },
  ],
};

beforeEach(() => {
  useReplayStore.setState(initialState, true);
  ipcRenderer.invocations.length = 0;
  vi.clearAllMocks();
});

describe("starting a replay import", () => {
  it("asks the main process to load the directory, passing the replays it already has", async () => {
    ipcRenderer.setInvokeResult("begin-loading-replays", true);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");

    expect(ipcRenderer.invocations).toEqual([
      {
        channel: "begin-loading-replays",
        args: {
          replayDirectory: "C:/Slippi",
          existingReplayNames: ["Existing.slp"],
        },
      },
    ]);
    expect(useReplayStore.getState().isLoadingReplays).toBe(true);
  });

  it("does nothing when no directory has been chosen", async () => {
    await useReplayStore.getState().loadReplayDirectory("");

    expect(ipcRenderer.invocations).toEqual([]);
    expect(useReplayStore.getState().isLoadingReplays).toBe(false);
  });

  // Main declines when a load is already running or the directory cannot be
  // read. No `end-loading-replays` follows, so a progress bar raised here would
  // stay up for the rest of the session.
  it("does not show progress when the main process declines the import", async () => {
    ipcRenderer.setInvokeResult("begin-loading-replays", false);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");

    expect(useReplayStore.getState().isLoadingReplays).toBe(false);
  });
});

describe("import progress", () => {
  it("reflects progress reported by the main process", async () => {
    await ipcRenderer.emit("update-replay-load-progress", {
      currentReplaysLoaded: 40,
      totalReplaysToLoad: 100,
      replaysPerSecond: 8,
    });

    expect(useReplayStore.getState()).toMatchObject({
      isLoadingReplays: true,
      currentReplaysLoaded: 40,
      totalReplaysToLoad: 100,
      replaysPerSecond: 8,
    });
  });

  it("clears progress and publishes the final counts and stats when the import ends", async () => {
    await ipcRenderer.emit("update-replay-load-progress", {
      currentReplaysLoaded: 40,
      totalReplaysToLoad: 100,
      replaysPerSecond: 8,
    });

    await ipcRenderer.emit("end-loading-replays", {});

    expect(useReplayStore.getState()).toMatchObject({
      isLoadingReplays: false,
      currentReplaysLoaded: 0,
      totalReplaysToLoad: 0,
      replaysPerSecond: 0,
      totalReplayCount: 12,
      totalBadReplayCount: 3,
      userConnectCode: USER,
    });
    expect(useReplayStore.getState().newStatInfo).not.toBeNull();
  });
});

describe("storing a batch of parsed replays", () => {
  const batch = {
    token: 7,
    count: 3,
    replays: [makeMatch({ isWin: true }), makeMatch({ isWin: false })],
    badReplays: [{ name: "Bad.slp", path: "C:/Slippi/Bad.slp" }],
  };

  it("writes the batch and acks it so the worker is released", async () => {
    await ipcRenderer.emit("insert-parsed-replays", batch);
    // The write chain is a promise, so let it settle before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(db.insertReplays).toHaveBeenCalledWith(batch.replays);
    expect(db.insertBadReplays).toHaveBeenCalledWith(batch.badReplays);
    expect(ipcRenderer.invocations).toEqual([
      { channel: "replays-inserted", args: { token: 7, count: 3 } },
    ]);
  });

  // The ack is the pool's backpressure: dropping it on a failed write would
  // wedge the worker that produced this batch for the rest of the import.
  it("still acks when the write fails", async () => {
    vi.mocked(db.insertReplays).mockRejectedValueOnce(new Error("quota"));

    await ipcRenderer.emit("insert-parsed-replays", batch);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ipcRenderer.invocations).toEqual([
      { channel: "replays-inserted", args: { token: 7, count: 3 } },
    ]);
  });
});

describe("a live game starting", () => {
  it("records the game in progress", async () => {
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState()).toMatchObject({
      currentLiveFileName: "Game_Live.slp",
      currentReplayInfo: {
        stageId: "31",
        players: liveGameArgs.players,
      },
    });
  });

  it("has no head-to-head to show before any stats have been loaded", async () => {
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState().headToHeadStats).toBeNull();
  });

  it("shows the record against this opponent once stats are loaded", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats(
        [makeMatch({ isWin: true }), makeMatch({ isWin: false })],
        USER,
      ),
      userConnectCode: USER,
    });

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(
      useReplayStore.getState().headToHeadStats?.opponentStats,
    ).toMatchObject({
      opponentConnectCode: OPPONENT,
      overallStat: { totalCount: 2, winCount: 1, lossCount: 1 },
    });
  });

  // fs.watch fires repeatedly while a replay is being written, so the same
  // filename arrives many times. Only the first should be acted on.
  it("ignores repeat notifications for the game already in progress", async () => {
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    useReplayStore.setState({ headToHeadStats: null });
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    // Untouched: the second notification returned before writing any state.
    expect(useReplayStore.getState().headToHeadStats).toBeNull();
  });

  it("acts on a genuinely new game", async () => {
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    await ipcRenderer.emit("live-replay-loaded", {
      ...liveGameArgs,
      filename: "Game_Next.slp",
    });

    expect(useReplayStore.getState().currentLiveFileName).toBe("Game_Next.slp");
  });
});

describe("a finished game updating the stats", () => {
  const finished = { replayName: "Game_Finished.slp" };

  it("identifies the user from the live game when one is in progress", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      currentReplayInfo: {
        stageId: "31",
        players: liveGameArgs.players,
      },
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(db.determineUserBasedOnLiveGame).toHaveBeenCalledWith([
      USER,
      OPPONENT,
    ]);
    expect(db.attemptGetUser).not.toHaveBeenCalled();
  });

  it("falls back to the stored user when no game is in progress", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      currentReplayInfo: null,
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(db.attemptGetUser).toHaveBeenCalled();
    expect(db.determineUserBasedOnLiveGame).not.toHaveBeenCalled();
  });

  it("does nothing when no stats have been loaded yet", async () => {
    useReplayStore.setState({ newStatInfo: null, userConnectCode: "" });

    await ipcRenderer.emit("update-stats", finished);

    expect(useReplayStore.getState().newStatInfo).toBeNull();
    expect(useReplayStore.getState().userConnectCode).toBe("");
  });

  it("folds the newly finished replay into the running stats", async () => {
    vi.mocked(db.selectReplay).mockResolvedValueOnce(makeMatch({ isWin: true }));
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      currentReplayInfo: { stageId: "31", players: liveGameArgs.players },
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(db.selectReplay).toHaveBeenCalledWith("Game_Finished.slp");
    expect(
      useReplayStore.getState().newStatInfo?.stats.overallStat,
    ).toMatchObject({ totalCount: 2, winCount: 2 });
  });

  // Main only names a replay it actually stored. Without a name there is
  // nothing new to count, and the store must not go looking for "the latest"
  // replay — that is the previous game, and it has already been counted.
  it("ignores a notification that names no replay", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      currentReplayInfo: { stageId: "31", players: liveGameArgs.players },
    });

    await ipcRenderer.emit("update-stats", {});

    expect(db.selectReplay).not.toHaveBeenCalled();
    expect(
      useReplayStore.getState().newStatInfo?.stats.overallStat,
    ).toMatchObject({ totalCount: 1 });
  });

  // The replay is on disk but the user is not in it (a spectated game, or the
  // wrong player was identified). The running stats have to survive that.
  it("keeps the existing stats when the finished replay cannot be counted", async () => {
    vi.mocked(db.selectReplay).mockResolvedValueOnce(null);
    const stats = buildStats([makeMatch({ isWin: true })], USER);
    useReplayStore.setState({
      newStatInfo: stats,
      currentReplayInfo: { stageId: "31", players: liveGameArgs.players },
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(useReplayStore.getState().newStatInfo).toBe(stats);
  });
});
