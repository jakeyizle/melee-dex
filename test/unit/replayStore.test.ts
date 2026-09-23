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
  getUserCandidates: vi.fn(async () => [
    { connectCode: USER, appearances: 12 },
    { connectCode: OPPONENT, appearances: 4 },
  ]),
  // Confident by default: the library tells the two players apart. The
  // identity tests below override it for the coin-flip case.
  identifyUserFromLiveGame: vi.fn(async () => ({
    connectCode: USER,
    isConfident: true,
  })),
  selectRecentReplaysAgainst: vi.fn(async () => []),
  deleteAllReplays: vi.fn(async () => {}),
  selectReplay: vi.fn(async () => null),
  deleteLegacyLatestReplayPointer: vi.fn(async () => {}),
  insertReplays: vi.fn(async () => {}),
  insertBadReplays: vi.fn(async () => {}),
  executeCallbackOnEachReplay: vi.fn(async () => {}),
}));

vi.mock("@/db/settings", () => ({
  selectSetting: vi.fn(async () => ""),
  upsertSetting: vi.fn(async () => {}),
  // Up to date by default, so an ordinary import is the case under test. The
  // backfill tests below override it.
  needsReplayBackfill: vi.fn(async () => false),
  markReplayBackfillDone: vi.fn(async () => {}),
}));

const db = await import("@/db/replays");
const settings = await import("@/db/settings");
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

describe("backfilling replays after a schema change", () => {
  it("skips nothing, so every file on disk is read again", async () => {
    vi.mocked(settings.needsReplayBackfill).mockResolvedValueOnce(true);
    ipcRenderer.setInvokeResult("begin-loading-replays", true);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");

    expect(ipcRenderer.invocations).toEqual([
      {
        channel: "begin-loading-replays",
        args: { replayDirectory: "C:/Slippi", existingReplayNames: [] },
      },
    ]);
    expect(useReplayStore.getState().isBackfilling).toBe(true);
  });

  // The directory may have been moved, in which case main declines and nothing
  // was re-read. Marking it done here would lose the backfill for good.
  it("stays outstanding when the import never started", async () => {
    vi.mocked(settings.needsReplayBackfill).mockResolvedValueOnce(true);
    ipcRenderer.setInvokeResult("begin-loading-replays", false);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");
    await ipcRenderer.emit("end-loading-replays", {});

    expect(useReplayStore.getState().isBackfilling).toBe(false);
    expect(settings.markReplayBackfillDone).not.toHaveBeenCalled();
  });

  it("is marked done once the import it started finishes", async () => {
    vi.mocked(settings.needsReplayBackfill).mockResolvedValueOnce(true);
    ipcRenderer.setInvokeResult("begin-loading-replays", true);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");
    await ipcRenderer.emit("end-loading-replays", {});

    expect(settings.markReplayBackfillDone).toHaveBeenCalled();
    expect(useReplayStore.getState().isBackfilling).toBe(false);
  });

  it("leaves an ordinary import skipping what it already has", async () => {
    ipcRenderer.setInvokeResult("begin-loading-replays", true);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");
    await ipcRenderer.emit("end-loading-replays", {});

    expect(ipcRenderer.invocations[0].args).toMatchObject({
      existingReplayNames: ["Existing.slp"],
    });
    expect(settings.markReplayBackfillDone).not.toHaveBeenCalled();
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

  it("clears progress and publishes the final counts when the import ends", async () => {
    vi.mocked(settings.selectSetting).mockResolvedValueOnce(USER);

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
    expect(useReplayStore.getState().userCandidates).toEqual([]);
  });
});

describe("recent games against the live opponent", () => {
  it("queries them for the opponent, not the user", async () => {
    useReplayStore.setState({ userConnectCode: USER });

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(db.selectRecentReplaysAgainst).toHaveBeenCalledWith(OPPONENT, 5);
  });

  it("publishes what the query returns", async () => {
    const history = [makeMatch({ isWin: true })];
    useReplayStore.setState({ userConnectCode: USER });
    vi.mocked(db.selectRecentReplaysAgainst).mockResolvedValueOnce(history);

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState().recentReplays).toEqual(history);
  });

  // The scan takes hundreds of milliseconds over a large library. If the next
  // game starts first, the list it returns is for the previous opponent.
  it("drops a result that arrives after the next game has started", async () => {
    useReplayStore.setState({ userConnectCode: USER });
    vi.mocked(db.selectRecentReplaysAgainst).mockImplementationOnce(async () => {
      useReplayStore.setState({ currentLiveFileName: "Game_Newer.slp" });
      return [makeMatch({ isWin: true })];
    });

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState().recentReplays).toEqual([]);
  });
});

describe("working out who the user is", () => {
  // Rule A. The configured code is the only thing trusted without confirmation.
  it("uses the configured connect code and builds stats against it", async () => {
    vi.mocked(settings.selectSetting).mockResolvedValueOnce(USER);

    await ipcRenderer.emit("end-loading-replays", {});

    expect(useReplayStore.getState().userConnectCode).toBe(USER);
    expect(useReplayStore.getState().newStatInfo).not.toBeNull();
    expect(db.getUserCandidates).not.toHaveBeenCalled();
  });

  // Rule C. Nothing configured and no game played yet: the app has a good guess
  // but offers it instead of storing it, and builds no stats in the meantime.
  it("offers candidates rather than guessing when nothing is configured", async () => {
    await ipcRenderer.emit("end-loading-replays", {});

    expect(useReplayStore.getState().userConnectCode).toBe("");
    expect(useReplayStore.getState().newStatInfo).toBeNull();
    expect(useReplayStore.getState().userCandidates).toEqual([
      { connectCode: USER, appearances: 12 },
      { connectCode: OPPONENT, appearances: 4 },
    ]);
  });

  it("stores the candidate the user confirms and rebuilds stats for it", async () => {
    useReplayStore.setState({
      userCandidates: [{ connectCode: USER, appearances: 12 }],
    });

    await useReplayStore.getState().confirmUserConnectCode("user#001");

    expect(settings.upsertSetting).toHaveBeenCalledWith("username", USER);
    expect(useReplayStore.getState()).toMatchObject({
      userConnectCode: USER,
      userCandidates: [],
    });
    expect(useReplayStore.getState().newStatInfo).not.toBeNull();
  });

  // Rule B. A game in progress contains the user, so it settles the question
  // without asking — as long as the library tells the two players apart.
  it("takes the user from a live game when the answer is not a coin flip", async () => {
    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState().userConnectCode).toBe(USER);
    expect(settings.upsertSetting).toHaveBeenCalledWith("username", USER);
  });

  // An even split is decided by port order, which is no evidence at all.
  it("does not store a live-game guess the library cannot support", async () => {
    vi.mocked(db.identifyUserFromLiveGame).mockResolvedValueOnce({
      connectCode: USER,
      isConfident: false,
    });

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(useReplayStore.getState().userConnectCode).toBe("");
    expect(settings.upsertSetting).not.toHaveBeenCalled();
  });

  it("leaves a configured connect code alone when a game starts", async () => {
    useReplayStore.setState({ userConnectCode: OPPONENT });

    await ipcRenderer.emit("live-replay-loaded", liveGameArgs);

    expect(db.identifyUserFromLiveGame).not.toHaveBeenCalled();
    expect(useReplayStore.getState().userConnectCode).toBe(OPPONENT);
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

  // The identity is already settled by the time a game finishes — rules A and
  // B both run before this. Working it out again here could answer differently
  // from the code `newStatInfo` was folded against, and count the game for the
  // wrong player.
  it("counts the game for whoever the running stats were built for", async () => {
    vi.mocked(db.selectReplay).mockResolvedValueOnce(makeMatch({ isWin: true }));
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      userConnectCode: USER,
      currentReplayInfo: { stageId: "31", players: liveGameArgs.players },
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(useReplayStore.getState().userConnectCode).toBe(USER);
    expect(
      useReplayStore.getState().newStatInfo?.stats.overallStat,
    ).toMatchObject({ totalCount: 2, winCount: 2 });
  });

  it("does nothing when no identity has been settled", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      userConnectCode: "",
    });

    await ipcRenderer.emit("update-stats", finished);

    expect(db.selectReplay).not.toHaveBeenCalled();
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
      userConnectCode: USER,
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

describe("a replay directory that cannot be read", () => {
  it("records which directory failed", async () => {
    await ipcRenderer.emit("replay-directory-unreadable", {
      replayDirectory: "D:/Gone",
    });

    expect(useReplayStore.getState().replayDirectoryError).toBe("D:/Gone");
  });

  // The message is the only signal; main gives up silently otherwise.
  it("records the failure even when no directory is named", async () => {
    await ipcRenderer.emit("replay-directory-unreadable", {});

    expect(useReplayStore.getState().replayDirectoryError).toBe("");
  });

  it("clears the failure when another load is attempted", async () => {
    useReplayStore.setState({ replayDirectoryError: "D:/Gone" });
    ipcRenderer.setInvokeResult("begin-loading-replays", true);

    await useReplayStore.getState().loadReplayDirectory("C:/Slippi");

    expect(useReplayStore.getState().replayDirectoryError).toBeNull();
  });
});

describe("changing the replay directory", () => {
  it("throws away the library and everything derived from it", async () => {
    useReplayStore.setState({
      newStatInfo: buildStats([makeMatch({ isWin: true })], USER),
      totalReplayCount: 12,
      totalBadReplayCount: 3,
      userCandidates: [{ connectCode: USER, appearances: 12 }],
      currentReplayInfo: { stageId: "31", players: liveGameArgs.players },
      recentReplays: [makeMatch({ isWin: true })],
    });

    await useReplayStore.getState().clearLibrary();

    expect(db.deleteAllReplays).toHaveBeenCalledOnce();
    expect(useReplayStore.getState()).toMatchObject({
      newStatInfo: null,
      totalReplayCount: 0,
      totalBadReplayCount: 0,
      userCandidates: [],
      currentReplayInfo: null,
      recentReplays: [],
    });
  });

  // The connect code is about who the user is, not which folder they keep
  // their replays in.
  it("keeps the configured connect code", async () => {
    useReplayStore.setState({ userConnectCode: USER });

    await useReplayStore.getState().clearLibrary();

    expect(useReplayStore.getState().userConnectCode).toBe(USER);
  });
});
