import { create } from "zustand";
import {
  Replay,
  selectBadReplayCount,
  selectReplayCount,
  selectReplaysWithBothPlayers,
  selectReplaysWithUser,
} from "@/db/replays";
import { CurrentReplayInfo, LiveReplayPlayers } from "@/types";
import { selectAllReplayNames } from "@/db/replays";

type ReplayStore = {
  // Shared state
  userReplays: Replay[];
  headToHeadReplays: Replay[];
  currentReplayInfo: CurrentReplayInfo | null;
  currentLiveFileName: string;
  currentUserConnectCode: string;

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
  userReplays: [],
  headToHeadReplays: [],
  currentReplayInfo: null,
  currentLiveFileName: "",
  currentUserConnectCode: "",

  isLoadingReplays: false,
  currentReplaysLoaded: 0,
  totalReplaysToLoad: 0,
  replaysPerSecond: 0,
  totalReplayCount: 0,
  totalBadReplayCount: 0,

  loadReplayDirectory: async (replayDirectory) => {
    if (!replayDirectory) return;
    const existingReplayNames = await selectAllReplayNames();
    window.ipcRenderer.invoke("begin-loading-replays", {
      replayDirectory,
      existingReplayNames,
    });
    set({ isLoadingReplays: true });
  },

  handleLiveReplay: async ({ filename, players, stageId }) => {
    const currentLiveFileName = get().currentLiveFileName;

    console.log("handleLiveReplay", filename, currentLiveFileName);
    if (filename === currentLiveFileName) return;

    const { userConnectCode, userReplays } = await selectReplaysWithUser(
      players.map((p) => p.connectCode),
    );

    const headToHeadReplays = await selectReplaysWithBothPlayers([
      players[0].connectCode,
      players[1].connectCode,
    ]);

    set({
      userReplays,
      headToHeadReplays,
      currentReplayInfo: { players, stageId },
      currentLiveFileName: filename,
      currentUserConnectCode: userConnectCode,
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
    const { currentReplayInfo } = getState();
    const headToHeadReplays = currentReplayInfo
      ? await selectReplaysWithBothPlayers([
          currentReplayInfo.players[0].connectCode,
          currentReplayInfo.players[1].connectCode,
        ])
      : [];

    const { userReplays, userConnectCode } = await selectReplaysWithUser(
      currentReplayInfo?.players.map((p) => p.connectCode) || [],
    );

    const totalReplayCount = await selectReplayCount();
    const totalBadReplayCount = await selectBadReplayCount();
    setState({
      isLoadingReplays: false,
      currentReplaysLoaded: 0,
      totalReplaysToLoad: 0,
      replaysPerSecond: 0,
      headToHeadReplays,
      userReplays,
      totalReplayCount,
      totalBadReplayCount,
      currentUserConnectCode: userConnectCode,
    });
  });
};
