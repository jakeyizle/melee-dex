import { SettingsRepository } from "./settingsRepository";
import type { RejectReason, RejectedReplay } from "../replayParsing";

export type ReplayPlayer = {
  connectCode: string;
  name: string;
  characterId: string;
};

/**
 * Ranked games carry a set structure; everything else does not. Anything whose
 * matchId does not start with `mode.ranked` — direct, unranked, and every
 * pre-matchId replay — is unranked, so there is no third bucket and no
 * migration: a stored replay with no `mode` is an old row and is unranked.
 */
export type ReplayMode = "ranked" | "unranked";

export type Replay = {
  name: string;
  path: string;
  date: string;
  stageId: string;
  players: ReplayPlayer[];
  winnerConnectCode: string;
  /** Absent on replays stored before this field existed — treat as "unranked". */
  mode?: ReplayMode;
  /** Slippi's match identifier, e.g. `mode.unranked-2025-04-18T03:01:45.00-3`. Empty before slp 3.14. */
  matchId?: string;
  /** Game within a ranked set. Always 1 for unranked, null on older replays. */
  gameNumber?: number | null;
  /** Length in frames, i.e. duration at 60fps. */
  lastFrame?: number | null;
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
  clear(): Promise<void>;
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

  /**
   * Rejected replays, stored with *why* they were rejected.
   *
   * Older versions stored the path alone, as a bare string. Those rows are
   * still valid and simply have no reason — see `selectBadReplayReasons`.
   */
  const insertBadReplays = async (badReplays: RejectedReplay[]) => {
    await Promise.all(
      badReplays.map(({ name, path, reason }) =>
        badReplaysStore.setItem(name, { path, reason }),
      ),
    );
  };

  /**
   * How many replays were rejected for each reason, commonest first.
   *
   * Tolerates rows written before the reason was recorded — a bare path string
   * — by counting them as unknown rather than skipping them, so the totals
   * still add up to `selectBadReplayCount`.
   */
  const selectBadReplayReasons = async (): Promise<
    { reason: RejectReason | "unknown"; count: number }[]
  > => {
    const counts = new Map<RejectReason | "unknown", number>();
    await badReplaysStore.iterate((value: unknown) => {
      const reason =
        typeof value === "object" && value !== null && "reason" in value
          ? ((value as { reason: RejectReason }).reason ?? "unknown")
          : "unknown";
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    });
    return Array.from(counts, ([reason, count]) => ({ reason, count })).sort(
      (a, b) => b.count - a.count,
    );
  };

  const selectReplayCount = async () => {
    return await replaysStore.length();
  };

  const selectReplay = async (name: string) => {
    return await replaysStore.getItem<Replay>(name);
  };

  /**
   * Empties the library, both the accepted replays and the rejected ones.
   *
   * Used when the replay directory changes: the stored replays describe games
   * found under the *old* directory, and leaving them would silently fold two
   * libraries into one set of statistics.
   */
  const deleteAllReplays = async () => {
    await replaysStore.clear();
    await badReplaysStore.clear();
  };

  /** One-time cleanup of the legacy pointer. See `LATEST_REPLAY_KEY`. */
  const deleteLegacyLatestReplayPointer = async () => {
    await replaysStore.removeItem(LATEST_REPLAY_KEY);
  };

  /** How many times each connect code appears across the whole library. */
  const countAppearancesByConnectCode = async () => {
    const userCounts = new Map<string, number>();
    await replaysStore.iterate((value: Replay) => {
      value?.players?.forEach((player) => {
        userCounts.set(
          player.connectCode,
          (userCounts.get(player.connectCode) || 0) + 1,
        );
      });
    });
    return userCounts;
  };

  /**
   * The connect codes most likely to be the user, commonest first. This is the
   * same count `getMostCommonUser` works from, kept rather than reduced to a
   * single answer: the app offers these to be confirmed instead of picking one
   * silently, because a wrong guess that gets persisted is invisible and sticky.
   */
  const getUserCandidates = async (limit: number) => {
    const userCounts = await countAppearancesByConnectCode();
    return Array.from(userCounts, ([connectCode, appearances]) => ({
      connectCode,
      appearances,
    }))
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, limit);
  };

  const getMostCommonUser = async (
    possibleUsers: string[],
  ): Promise<string> => {
    const userCounts = await countAppearancesByConnectCode();
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

  /**
   * The most recent games against one opponent, newest first.
   *
   * One full cursor scan of the replay store, which is ~16.6us per stored
   * replay: 330ms over 20,000, 830ms over 50,000. Filtering costs nothing next
   * to the scan itself — bucketing *every* opponent in the same pass measures
   * the same — so keeping these lists in the running `FullStats` would not buy
   * a cheaper scan, only a rarer one. This runs once when an opponent becomes
   * known, not per render, so it is paid once per game.
   */
  const selectRecentReplaysAgainst = async (
    opponentConnectCode: string,
    limit: number,
  ): Promise<Replay[]> => {
    if (!opponentConnectCode || limit <= 0) return [];

    const newest: Replay[] = [];
    // Trimmed on the way through rather than collected and sorted at the end:
    // a long history against one opponent would otherwise be materialized in
    // full just to throw all but `limit` of it away.
    const trim = () => {
      newest.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      newest.length = Math.min(newest.length, limit);
    };

    await replaysStore.iterate((replay: Replay) => {
      const isAgainstOpponent = replay?.players?.some(
        (player) => player.connectCode === opponentConnectCode,
      );
      if (!isAgainstOpponent) return;
      newest.push(replay);
      if (newest.length > limit * 4) trim();
    });
    trim();

    return newest;
  };

  const selectBadReplayCount = async () => {
    return await badReplaysStore.length();
  };

  /**
   * Who the user is in a game that is happening right now, and whether the
   * answer rests on anything.
   *
   * `isConfident` is false exactly when the two players appear in the library
   * equally often, which is what happens for a new user with nothing imported:
   * `getMostCommonUser` then falls back to the first candidate, and candidates
   * arrive in the live game's port order, so the answer is a coin flip. Callers
   * use the code either way but must not persist an unconfident one — a wrong
   * connect code, once stored, is invisible and never revisited.
   */
  const identifyUserFromLiveGame = async (liveGameConnectCodes: string[]) => {
    const configured = (await settings.selectSetting("username")).toUpperCase();
    if (liveGameConnectCodes.includes(configured)) {
      return { connectCode: configured, isConfident: true };
    }

    const userCounts = await countAppearancesByConnectCode();
    const [first, second] = liveGameConnectCodes.map(
      (code) => userCounts.get(code) ?? 0,
    );

    return {
      connectCode: await getMostCommonUser(liveGameConnectCodes),
      isConfident: first !== second,
    };
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
    selectBadReplayReasons,
    selectReplayCount,
    selectReplay,
    deleteAllReplays,
    deleteLegacyLatestReplayPointer,
    getMostCommonUser,
    getUserCandidates,
    identifyUserFromLiveGame,
    selectRecentReplaysAgainst,
    selectBadReplayCount,
    executeCallbackOnEachReplay,
  };
};

export type ReplayRepository = ReturnType<typeof createReplayRepository>;
