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
  length(): Promise<number>;
  iterate<T, U>(
    iteratee: (value: T, key: string, iterationNumber: number) => U | void,
  ): Promise<U | void>;
};

export type ReplayStores = {
  replaysStore: KeyValueStore;
  badReplaysStore: KeyValueStore;
};

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

  const insertReplay = async (replay: Replay) => {
    await replaysStore.setItem(replay.name, replay);
    await replaysStore.setItem(LATEST_REPLAY_KEY, replay.name);
  };

  const insertBadReplay = async ({
    name,
    path,
  }: {
    name: string;
    path: string;
  }) => {
    await badReplaysStore.setItem(name, path);
  };

  const selectReplayCount = async () => {
    return await replaysStore.length();
  };

  const selectLatestReplay = async () => {
    const latestReplayKey = (await replaysStore.getItem(
      LATEST_REPLAY_KEY,
    )) as string;
    if (!latestReplayKey) return null;
    return (await replaysStore.getItem(latestReplayKey)) as Replay;
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
      return maxKeys[0];
    }
    return firstUserValue > secondUserValue
      ? possibleUsers[0]
      : possibleUsers[1];
  };

  const selectBadReplayCount = async () => {
    return await badReplaysStore.length();
  };

  const determineUserBasedOnLiveGame = async (
    liveGameConnectCodes: string[],
  ) => {
    // probably overcomplicating this
    // get user from setttings -> make sure they are in the current live replay
    // if not, return whichever player in the current live replay has most replays
    // if tied, return first player

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
    await replaysStore.iterate((replay: Replay, key) => callback(replay));
  };

  return {
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
  };
};

export type ReplayRepository = ReturnType<typeof createReplayRepository>;
