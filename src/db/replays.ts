import { replaysStore, badReplaysStore } from "./stores";
import { createReplayRepository } from "./replayRepository";
import { settingsRepository } from "./settings";

export type { Replay, ReplayPlayer, KeyValueStore } from "./replayRepository";
export { LATEST_REPLAY_KEY } from "./replayRepository";

// The app-wide instance, bound to the real localforage stores.
// Tests build their own repository over an in-memory store instead.
export const replayRepository = createReplayRepository(
  { replaysStore, badReplaysStore },
  settingsRepository,
);

export const {
  selectAllReplayNames,
  insertReplay,
  insertBadReplay,
  selectReplayCount,
  selectLatestReplay,
  getMostCommonUser,
  selectBadReplayCount,
  determineUserBasedOnLiveGame,
  attemptGetUser,
  executeCallbackOnEachReplay,
} = replayRepository;
