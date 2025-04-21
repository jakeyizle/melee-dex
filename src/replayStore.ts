import { create } from "zustand";
import {
  Replay,
  selectBadReplayCount,
  selectReplayCount,
  selectReplaysWithBothPlayers,
  selectReplaysWithUser,
} from "@/db/replays";
import {
  CurrentReplayInfo,
  HeadToHeadStat,
  LiveReplayPlayers,
  UserStat,
} from "@/types";
import { selectAllReplayNames } from "@/db/replays";
import { getStats } from "./utils/statUtils";

type ReplayStore = {
  // Shared state
  currentReplayInfo: CurrentReplayInfo | null;
  currentLiveFileName: string;
  userStat: UserStat | null;
  headToHeadStats: HeadToHeadStat[];
  headToHeadReplays: Replay[];

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
  userStat: null,
  headToHeadStats: [],
  headToHeadReplays: [],

  isLoadingReplays: false,
  currentReplaysLoaded: 0,
  totalReplaysToLoad: 0,
  replaysPerSecond: 0,
  totalReplayCount: 0,
  totalBadReplayCount: 0,

  loadReplayDirectory: async (replayDirectory) => {
    if (!replayDirectory) return;
    const existingReplayNames = await selectAllReplayNames();
    await window.ipcRenderer.invoke("begin-loading-replays", {
      replayDirectory,
      existingReplayNames,
    });
    set({ isLoadingReplays: true });
  },

  handleLiveReplay: async ({ filename, players, stageId }) => {
    const currentLiveFileName = get().currentLiveFileName;

    if (filename === currentLiveFileName) return;
    const { userStat, headToHeadStats, headToHeadReplays } = await getStats({
      players,
      stageId,
    });
    set({
      userStat,
      headToHeadStats,
      headToHeadReplays,
      currentReplayInfo: { players, stageId },
      currentLiveFileName: filename,
    });
  },
}));

// Set up listeners once in your app root
export const setupReplayStoreIpcListeners = () => {
  const { getState, setState } = useReplayStore;

  window.ipcRenderer.on("update-replay-load-progress", (_event, args) => {
    console.log("update-replay-load-progress", args);
    setState({
      isLoadingReplays: true,
      currentReplaysLoaded: args.currentReplaysLoaded,
      totalReplaysToLoad: args.totalReplaysToLoad,
      replaysPerSecond: args.replaysPerSecond,
    });
  });

  window.ipcRenderer.on("live-replay-loaded", (_event, args) => {
    console.log("live-replay-loaded", args);
    const { handleLiveReplay } = getState();
    handleLiveReplay(args);
  });

  window.ipcRenderer.on("end-loading-replays", async (_event, args) => {
    console.log("end-loading-replays", args);
    const totalReplayCount = await selectReplayCount();
    const totalBadReplayCount = await selectBadReplayCount();
    const { currentReplayInfo } = getState();
    let { userStat, headToHeadStats, headToHeadReplays } = !!currentReplayInfo
      ? await getStats(currentReplayInfo)
      : {
          userStat: null,
          headToHeadStats: [],
          headToHeadReplays: [],
        };
    setState({
      isLoadingReplays: false,
      currentReplaysLoaded: 0,
      totalReplaysToLoad: 0,
      replaysPerSecond: 0,
      totalReplayCount,
      totalBadReplayCount,
      userStat,
      headToHeadStats,
      headToHeadReplays,
    });
  });
};
