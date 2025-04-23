import { create } from "zustand";
import { Replay, selectBadReplayCount, selectReplayCount } from "@/db/replays";
import { CurrentReplayInfo, LiveReplayPlayers, StatInfo } from "@/types";
import { selectAllReplayNames } from "@/db/replays";
import { getStatInfo } from "./utils/statUtils";

type ReplayStore = {
  // Shared state
  currentReplayInfo: CurrentReplayInfo | null;
  currentLiveFileName: string;
  headToHeadReplays: Replay[];
  statInfo: StatInfo | null;

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
    const { statInfo, headToHeadReplays } = await getStatInfo({
      currentReplayInfo: { players, stageId },
    });

    set({
      currentReplayInfo: { players, stageId },
      currentLiveFileName: filename,
      statInfo,
      headToHeadReplays,
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

  window.ipcRenderer.on("live-replay-loaded", (_event, args) => {
    const { handleLiveReplay } = getState();
    handleLiveReplay(args);
  });

  window.ipcRenderer.on("end-loading-replays", async (_event, args) => {
    const totalReplayCount = await selectReplayCount();
    const totalBadReplayCount = await selectBadReplayCount();
    const { currentReplayInfo } = getState();
    const { statInfo, headToHeadReplays } = currentReplayInfo
      ? await getStatInfo({ currentReplayInfo })
      : { statInfo: null, headToHeadReplays: [] };

    setState({
      isLoadingReplays: false,
      currentReplaysLoaded: 0,
      totalReplaysToLoad: 0,
      replaysPerSecond: 0,
      totalReplayCount,
      totalBadReplayCount,
      statInfo,
      headToHeadReplays,
    });
  });
};
