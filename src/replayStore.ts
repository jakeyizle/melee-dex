import { create } from "zustand";
import {
  attemptGetUser,
  deleteLegacyLatestReplayPointer,
  determineUserBasedOnLiveGame,
  getMostCommonUser,
  insertBadReplays,
  insertReplays,
  Replay,
  selectBadReplayCount,
  selectReplayCount,
} from "@/db/replays";
import {
  CurrentReplayInfo,
  FullStats,
  HeadToHeadStats,
  LiveReplayPlayers,
  StatInfo,
} from "@/types";
import { selectAllReplayNames } from "@/db/replays";
import {
  getCurrentHeadToHeadStats,
  getStats,
  updateStatsWithReplay,
} from "./utils/statUtils";
import { updateUsernameIfEmpty } from "./db/settings";

type ReplayStore = {
  // Shared state
  currentReplayInfo: CurrentReplayInfo | null;
  currentLiveFileName: string;
  headToHeadReplays: Replay[];
  statInfo: StatInfo | null;
  newStatInfo: FullStats | null;
  userConnectCode: string;
  headToHeadStats: HeadToHeadStats | null;

  // Load progress
  isLoadingReplays: boolean;
  currentReplaysLoaded: number;
  totalReplaysToLoad: number;
  replaysPerSecond: number;
  totalReplayCount: number;
  totalBadReplayCount: number;

  // Actions
  loadReplayDirectory: (replayDirectory: string) => void;
  handleLiveReplay: (args: {
    filename: string;
    players: LiveReplayPlayers[];
    stageId: string;
  }) => void;
};

export const useReplayStore = create<ReplayStore>((set, get) => ({
  currentReplayInfo: null,
  currentLiveFileName: "",
  headToHeadReplays: [],
  statInfo: null,
  newStatInfo: null,
  userConnectCode: "",
  headToHeadStats: null,

  isLoadingReplays: false,
  currentReplaysLoaded: 0,
  totalReplaysToLoad: 0,
  replaysPerSecond: 0,
  totalReplayCount: 0,
  totalBadReplayCount: 0,

  loadReplayDirectory: async (replayDirectory) => {
    if (!replayDirectory) return;
    // Clears a row older versions left in the replays store. Delete this, and
    // the function behind it, once it has run.
    await deleteLegacyLatestReplayPointer();
    const existingReplayNames = await selectAllReplayNames();
    // Only main can say whether an import began. If it declined — a load is
    // already running, or the directory could not be read — no
    // `end-loading-replays` is coming, and showing the progress bar would
    // leave it up for the rest of the session.
    const hasStarted = await window.ipcRenderer.invoke("begin-loading-replays", {
      replayDirectory,
      existingReplayNames,
    });
    if (hasStarted) set({ isLoadingReplays: true });
  },

  handleLiveReplay: async ({ filename, players, stageId }) => {
    const currentLiveFileName = get().currentLiveFileName;
    if (filename === currentLiveFileName) return;

    const newStatInfo = get().newStatInfo;
    const headToHeadStats = newStatInfo
      ? getCurrentHeadToHeadStats(
          newStatInfo,
          { players, stageId },
          get().userConnectCode,
        )
      : null;
    set({
      currentReplayInfo: { players, stageId },
      currentLiveFileName: filename,
      headToHeadStats,
    });
  },
}));

// Set up listeners once in your app root
export const setupReplayStoreIpcListeners = () => {
  const { getState, setState } = useReplayStore;

  window.ipcRenderer.on("update-replay-load-progress", (_event, args) => {
    setState({
      isLoadingReplays: true,
      currentReplaysLoaded: args.currentReplaysLoaded,
      totalReplaysToLoad: args.totalReplaysToLoad,
      replaysPerSecond: args.replaysPerSecond,
    });
  });

  // Parsing happens in utilityProcess workers, but this renderer is the only
  // process with IndexedDB, so every parsed batch lands here. The chain keeps
  // writes serialized across workers, and the ack tells main that the worker
  // which produced this batch is free for the next one.
  let pendingWrites: Promise<void> = Promise.resolve();

  window.ipcRenderer.on("insert-parsed-replays", (_event, args) => {
    const { token, replays, badReplays, count } = args as {
      token: number;
      count: number;
      replays: Replay[];
      badReplays: { name: string; path: string }[];
    };

    pendingWrites = pendingWrites
      .then(async () => {
        await insertReplays(replays);
        await insertBadReplays(badReplays);
      })
      .catch(() => {
        // A failed write must not wedge the pool - still ack so it moves on.
      })
      .then(() => {
        window.ipcRenderer.invoke("replays-inserted", { token, count });
      });
  });

  window.ipcRenderer.on("live-replay-loaded", (_event, args) => {
    const { handleLiveReplay } = getState();
    handleLiveReplay(args);
  });

  window.ipcRenderer.on("end-loading-replays", async (_event, args) => {
    const totalReplayCount = await selectReplayCount();
    const totalBadReplayCount = await selectBadReplayCount();
    // const { currentReplayInfo } = getState();
    // const { statInfo, headToHeadReplays } = currentReplayInfo
    //   ? await getStatInfo({ currentReplayInfo })
    //   : { statInfo: null, headToHeadReplays: [] };
    // getMostCommonUser reads every replay in the library, so it is passed
    // unevaluated: it only runs when no username has been configured yet.
    const userConnectCode = await updateUsernameIfEmpty(() =>
      getMostCommonUser([]),
    );
    const statInfo = userConnectCode ? await getStats(userConnectCode) : null;
    setState({
      isLoadingReplays: false,
      currentReplaysLoaded: 0,
      totalReplaysToLoad: 0,
      replaysPerSecond: 0,
      totalReplayCount,
      totalBadReplayCount,
      newStatInfo: statInfo,
      userConnectCode,
    });
  });

  // Main names the replay it just finished loading. Only a replay that was
  // actually accepted and stored gets one, so there is nothing to fold in
  // without it.
  window.ipcRenderer.on("update-stats", async (_event, args) => {
    const replayName = (args as { replayName?: string } | undefined)?.replayName;
    if (!replayName) return;

    const { currentReplayInfo, newStatInfo } = getState();
    const userConnectCode = currentReplayInfo
      ? await determineUserBasedOnLiveGame(
          currentReplayInfo.players.map((player) => player.connectCode),
        )
      : await attemptGetUser();
    if (!userConnectCode || !newStatInfo) return;
    const stats = await updateStatsWithReplay(
      newStatInfo,
      userConnectCode,
      replayName,
    );
    const headToHeadStats = currentReplayInfo
      ? getCurrentHeadToHeadStats(stats, currentReplayInfo, userConnectCode)
      : null;
    setState({ newStatInfo: stats, userConnectCode, headToHeadStats });
  });
};
