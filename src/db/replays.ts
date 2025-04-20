import { selectSetting } from "./settings";
import { replaysStore, badReplaysStore } from "./stores";

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

export const selectAllReplayNames = async () => {
  const badNames = await badReplaysStore.keys();
  const goodNames = await replaysStore.keys();
  return [...goodNames, ...badNames];
};

export const insertReplay = async (replay: Replay) => {
  await replaysStore.setItem(replay.name, replay);
};

export const insertBadReplay = async ({
  name,
  path,
}: {
  name: string;
  path: string;
}) => {
  await badReplaysStore.setItem(name, path);
};

export const selectReplaysWithBothPlayers = async (connectCodes: string[]) => {
  let replays: Replay[] = [];
  await replaysStore.iterate((value: Replay, key) => {
    if (
      connectCodes.includes(value.players[0].connectCode) &&
      connectCodes.includes(value.players[1].connectCode)
    ) {
      replays.push(value);
    }
  });
  return replays;
};

export const selectReplaysWithPlayer = async (connectCode: string) => {
  let replays: Replay[] = [];
  await replaysStore.iterate((value: Replay, key) => {
    if (connectCode === value.players[0].connectCode) {
      replays.push(value);
    } else if (connectCode === value.players[1].connectCode) {
      replays.push(value);
    }
  });
  return replays;
};

export const selectReplaysWithUser = async (possibleUsers: string[]) => {
  // either user is set, or we find the most common one
  const userConnectCode =
    (await selectSetting("username")).toUpperCase() ||
    (await getMostCommonUser(possibleUsers));
  return {
    userReplays: await selectReplaysWithPlayer(userConnectCode),
    userConnectCode,
  };
};

export const selectReplayCount = async () => {
  return await replaysStore.length();
};

export const getMostCommonUser = async (
  possibleUsers: string[],
): Promise<string> => {
  const userCounts = new Map<string, number>();
  await replaysStore.iterate((value: Replay, key) => {
    value.players.forEach((player) => {
      userCounts.set(
        player.connectCode,
        (userCounts.get(player.connectCode) || 0) + 1,
      );
    });
  });
  const firstUserValue = userCounts.get(possibleUsers[0]) || 0;
  const secondUserValue = userCounts.get(possibleUsers[1]) || 0;
  if (!firstUserValue && !secondUserValue) {
    const maxValue = Math.max(...userCounts.values());
    const maxKeys = Array.from(userCounts.entries())
      .filter(([key, value]) => value === maxValue)
      .map(([key]) => key);
    return maxKeys[0];
  }
  return firstUserValue > secondUserValue ? possibleUsers[0] : possibleUsers[1];
};

export const selectBadReplayCount = async () => {
  return await badReplaysStore.length();
};

export const selectUserAndHeadToHeadReplays = async (
  userConnectCode: string,
  liveGameConnectCodes: string[],
) => {
  // combining fetching user replays and head to head replays in one function for performance
  let userReplays: Replay[] = [];
  let headToHeadReplays: Replay[] = [];

  await replaysStore.iterate((replay: Replay, key) => {
    const isUserReplay = replay.players.some((player) => {
      return player.connectCode === userConnectCode;
    });
    if (!isUserReplay) return undefined;

    const isHeadToHeadReplay = liveGameConnectCodes.every((connectCode) => {
      return replay.players.some((player) => {
        return player.connectCode === connectCode;
      });
    });

    isUserReplay && userReplays.push(replay);
    isHeadToHeadReplay && headToHeadReplays.push(replay);
  });
  return { userReplays, headToHeadReplays };
};

export const determineUserBasedOnLiveGame = async (
  liveGameConnectCodes: string[],
) => {
  // probably overcomplicating this
  // get user from setttings -> make sure they are in the current live replay
  // if not, return whichever player in the current live replay has most replays
  // if tied, return first player

  const userConnectCode = (await selectSetting("username")).toUpperCase();
  if (liveGameConnectCodes.includes(userConnectCode)) return userConnectCode;

  const mostCommonUser = await getMostCommonUser(liveGameConnectCodes);
  return mostCommonUser;
};
