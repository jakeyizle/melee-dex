import { SettingsRepository } from "./settingsRepository";

export type ReplayPlayer = {
  connectCode: string;
  name: string;
  characterId: string;
};

export type Replay = {
  name: string;
  path: string;
  date: string;
  stageId: string;
  players: ReplayPlayer[];
  winnerConnectCode: string;
};

/**
 * The subset of localforage we actually use. Depending on this rather than on
 * LocalForage itself is what lets tests run against an in-memory fake.
 */
export type KeyValueStore = {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  keys(): Promise<string[]>;
  removeItem(key: string): Promise<void>;
  length(): Promise<number>;
  iterate<T, U>(
    iteratee: (value: T, key: string, iterationNumber: number) => U | void,
  ): Promise<U | void>;
};

export type ReplayStores = {
  replaysStore: KeyValueStore;
  badReplaysStore: KeyValueStore;
};

/**
 * Legacy. Replays used to be written alongside a pointer at this key naming the
 * most recently inserted one, which meant the pointer was counted as a replay
 * and handed to anything iterating the store as though it were one. Nothing
 * writes or reads it any more; `deleteLegacyLatestReplayPointer` clears it out,
 * and both can be deleted once that has run.
 */
export const LATEST_REPLAY_KEY = "latestReplayKey";

export const createReplayRepository = (
  stores: ReplayStores,
  settings: SettingsRepository,
) => {
  const { replaysStore, badReplaysStore } = stores;

  const selectAllReplayNames = async () => {
    const badNames = await badReplaysStore.keys();
    const goodNames = await replaysStore.keys();
    return [...goodNames, ...badNames];
  };

  /**
   * Replays are always written a batch at a time, so this takes the batch.
   * localforage opens an IndexedDB transaction per `setItem`, and the previous
   * one-replay-at-a-time version awaited two of them per replay — 20 serialized
   * round trips for a batch of 10. The writes within a batch are independent,
   * so they go together and the latest-replay pointer is written once.
   */
  const insertReplays = async (replays: Replay[]) => {
    await Promise.all(
      replays.map((replay) => replaysStore.setItem(replay.name, replay)),
    );
  };

  const insertBadReplays = async (
    badReplays: { name: string; path: string }[],
  ) => {
    await Promise.all(
      badReplays.map(({ name, path }) => badReplaysStore.setItem(name, path)),
    );
  };

  const selectReplayCount = async () => {
    return await replaysStore.length();
  };

  const selectReplay = async (name: string) => {
    return await replaysStore.getItem<Replay>(name);
  };

  /** One-time cleanup of the legacy pointer. See `LATEST_REPLAY_KEY`. */
  const deleteLegacyLatestReplayPointer = async () => {
    await replaysStore.removeItem(LATEST_REPLAY_KEY);
  };

  const getMostCommonUser = async (
    possibleUsers: string[],
  ): Promise<string> => {
    const userCounts = new Map<string, number>();
    await replaysStore.iterate((value: Replay, key) => {
      value?.players?.forEach((player) => {
        userCounts.set(
          player.connectCode,
          (userCounts.get(player.connectCode) || 0) + 1,
        );
      });
    });
    const firstUserValue = possibleUsers[0]
      ? userCounts.get(possibleUsers[0]) || 0
      : 0;
    const secondUserValue = possibleUsers[1]
      ? userCounts.get(possibleUsers[1]) || 0
      : 0;
    if (!firstUserValue && !secondUserValue) {
      const maxValue = Math.max(...userCounts.values());
      const maxKeys = Array.from(userCounts.entries())
        .filter(([key, value]) => value === maxValue)
        .map(([key]) => key);
      // An empty store makes maxValue -Infinity, which matches no key. Say so
      // with the empty string the signature promises: callers treat this as
      // "no user yet", and one of them used to call .toUpperCase() on it.
      return maxKeys[0] ?? "";
    }
    // A tie goes to the first candidate. There is no signal left to break it
    // with — it means both players appear in the same number of stored replays,
    // which is exactly what happens when the whole library is games against one
    // opponent — and the candidates arrive in the live game's port order, so
    // picking the second was silently port-dependent. Setting the connect code
    // in Settings is what actually resolves this case.
    return firstUserValue >= secondUserValue
      ? possibleUsers[0]
      : possibleUsers[1];
  };

  const selectBadReplayCount = async () => {
    return await badReplaysStore.length();
  };

  const determineUserBasedOnLiveGame = async (
    liveGameConnectCodes: string[],
  ) => {
    // Prefer the configured username, as long as they are actually in this
    // game. Otherwise take whichever player appears in more stored replays,
    // and the first of them if that ties.

    const userConnectCode = (
      await settings.selectSetting("username")
    ).toUpperCase();
    if (liveGameConnectCodes.includes(userConnectCode)) return userConnectCode;

    const mostCommonUser = await getMostCommonUser(liveGameConnectCodes);
    return mostCommonUser;
  };

  const attemptGetUser = async () => {
    const userConnectCode = (
      await settings.selectSetting("username")
    ).toUpperCase();
    if (userConnectCode) return userConnectCode;
    const mostCommonConnectCode = await getMostCommonUser([]);
    return mostCommonConnectCode;
  };

  const executeCallbackOnEachReplay = async (
    callback: (replay: Replay) => void,
  ) => {
    await replaysStore.iterate((replay: Replay) => {
      callback(replay);
    });
  };

  return {
    selectAllReplayNames,
    insertReplays,
    insertBadReplays,
    selectReplayCount,
    selectReplay,
    deleteLegacyLatestReplayPointer,
    getMostCommonUser,
    selectBadReplayCount,
    determineUserBasedOnLiveGame,
    attemptGetUser,
    executeCallbackOnEachReplay,
  };
};

export type ReplayRepository = ReturnType<typeof createReplayRepository>;
