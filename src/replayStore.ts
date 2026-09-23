import { create } from "zustand";
import {
  deleteLegacyLatestReplayPointer,
  getUserCandidates,
  identifyUserFromLiveGame,
  selectRecentReplaysAgainst,
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
} from "@/types";
import { selectAllReplayNames } from "@/db/replays";
import {
  getCurrentHeadToHeadStats,
  getStats,
  updateStatsWithReplay,
} from "./utils/statUtils";
import {
  markReplayBackfillDone,
  needsReplayBackfill,
  selectSetting,
  upsertSetting,
} from "./db/settings";

/**
 * How many connect codes the identity card offers. Enough that the right answer
 * is still there when the commonest player is not the user — a shared machine,
 * or a library full of one opponent — and few enough to pick from at a glance.
 */
export const IDENTITY_CANDIDATE_LIMIT = 5;

export type UserCandidate = { connectCode: string; appearances: number };

/** How many past games against the current opponent the live view lists. */
export const RECENT_GAMES_LIMIT = 5;

type ReplayStore = {
  // Shared state
  currentReplayInfo: CurrentReplayInfo | null;
  currentLiveFileName: string;
  newStatInfo: FullStats | null;
  /** Whether the import in flight is a schema backfill. See `loadReplayDirectory`. */
  isBackfilling: boolean;
  /** Connect codes offered for the user to identify themselves. Empty once one is known. */
  userCandidates: UserCandidate[];
  /** The last few games against the current opponent, newest first. Queried per game. */
  recentReplays: Replay[];
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
  confirmUserConnectCode: (connectCode: string) => Promise<void>;
  handleLiveReplay: (args: {
    filename: string;
    players: LiveReplayPlayers[];
    stageId: string;
  }) => Promise<void>;
};

export const useReplayStore = create<ReplayStore>((set, get) => ({
  currentReplayInfo: null,
  currentLiveFileName: "",
  newStatInfo: null,
  isBackfilling: false,
  userCandidates: [],
  recentReplays: [],
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

    // A backfill is an import that skips nothing: every file on disk is
    // re-parsed and overwrites the row stored for it, which is the only way to
    // fill in fields that cannot be derived from what was stored. Rows whose
    // files have since been deleted keep their old shape and stay valid.
    const isBackfilling = await needsReplayBackfill();
    const existingReplayNames = isBackfilling
      ? []
      : await selectAllReplayNames();
    // Only main can say whether an import began. If it declined — a load is
    // already running, or the directory could not be read — no
    // `end-loading-replays` is coming, and showing the progress bar would
    // leave it up for the rest of the session.
    const hasStarted = await window.ipcRenderer.invoke("begin-loading-replays", {
      replayDirectory,
      existingReplayNames,
    });
    // Only a load that actually started has re-read the directory, so only that
    // one can be allowed to stamp the schema version when it ends. A declined
    // load — a directory that has been moved, or one with nothing in it — must
    // leave the backfill outstanding for the next launch.
    if (hasStarted) set({ isLoadingReplays: true, isBackfilling });
  },

  confirmUserConnectCode: async (connectCode) => {
    const userConnectCode = connectCode.trim().toUpperCase();
    if (!userConnectCode) return;
    await upsertSetting("username", userConnectCode);
    set({
      userConnectCode,
      userCandidates: [],
      newStatInfo: await getStats(userConnectCode),
    });
  },

  handleLiveReplay: async ({ filename, players, stageId }) => {
    const currentLiveFileName = get().currentLiveFileName;
    if (filename === currentLiveFileName) return;

    // Rule B: a game in progress names both players, and one of them is the
    // user. Taken only when nothing is configured yet, and stored only when the
    // library actually distinguishes the two — an even split is decided by port
    // order, which is no evidence at all.
    if (!get().userConnectCode) {
      const { connectCode, isConfident } = await identifyUserFromLiveGame(
        players.map((player) => player.connectCode),
      );
      if (connectCode && isConfident) {
        await get().confirmUserConnectCode(connectCode);
      }
    }

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
      // Cleared rather than left in place: what is on screen must never be the
      // previous opponent's games while this one's are being fetched.
      recentReplays: [],
    });

    // Queried, not held in the running stats: one scan costs the same whether
    // it answers for one opponent or all of them, and this happens once per
    // game rather than once per replay. Published separately so the rest of the
    // live view renders immediately and the list fills in behind it.
    const userConnectCode = get().userConnectCode;
    const opponent = players.find(
      (player) => player.connectCode !== userConnectCode,
    );
    if (!opponent) return;
    const recentReplays = await selectRecentReplaysAgainst(
      opponent.connectCode,
      RECENT_GAMES_LIMIT,
    );
    // The game may have moved on while the scan ran; a stale list must not
    // land on top of a newer one.
    if (get().currentLiveFileName === filename) set({ recentReplays });
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

  // Awaited: identifying the user from the live game reads the library, so the
  // state this publishes lands several ticks after the message arrives.
  window.ipcRenderer.on("live-replay-loaded", async (_event, args) => {
    const { handleLiveReplay } = getState();
    await handleLiveReplay(args);
  });

  window.ipcRenderer.on("end-loading-replays", async (_event, args) => {
    const totalReplayCount = await selectReplayCount();
    const totalBadReplayCount = await selectBadReplayCount();
    if (getState().isBackfilling) await markReplayBackfillDone();
    // Rule A: the connect code the user entered, and nothing else. Older
    // versions guessed the commonest player in the library here and *persisted*
    // it, so a wrong guess became permanent and silent. The guess is still made
    // — as candidates the identity card offers — but it is never stored until
    // it has been confirmed, either by the user or by a live game they are in.
    const userConnectCode = (await selectSetting("username")).toUpperCase();
    const userCandidates = userConnectCode
      ? []
      : await getUserCandidates(IDENTITY_CANDIDATE_LIMIT);
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
      userCandidates,
      isBackfilling: false,
    });
  });

  // Main names the replay it just finished loading. Only a replay that was
  // actually accepted and stored gets one, so there is nothing to fold in
  // without it.
  window.ipcRenderer.on("update-stats", async (_event, args) => {
    const replayName = (args as { replayName?: string } | undefined)?.replayName;
    if (!replayName) return;

    const { currentReplayInfo, newStatInfo, userConnectCode } = getState();
    // Whoever the stats were built for. This used to work the identity out
    // again from scratch, which could answer differently from the code
    // `newStatInfo` was folded against and quietly count the game for the wrong
    // player. There is nothing to fold into before an identity is settled
    // anyway: `newStatInfo` is null until one is.
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
