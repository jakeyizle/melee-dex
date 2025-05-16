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
  await replaysStore.setItem("latestReplayKey", replay.name);
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

export const selectReplayCount = async () => {
  return await replaysStore.length();
};

export const selectLatestReplay = async () => {
  const latestReplayKey = (await replaysStore.getItem(
    "latestReplayKey",
  )) as string;
  if (!latestReplayKey) return null;
  return (await replaysStore.getItem(latestReplayKey)) as Replay;
};

export const getMostCommonUser = async (
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
  return firstUserValue > secondUserValue ? possibleUsers[0] : possibleUsers[1];
};

export const selectBadReplayCount = async () => {
  return await badReplaysStore.length();
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

export const attemptGetUser = async () => {
  const userConnectCode = (await selectSetting("username")).toUpperCase();
  if (userConnectCode) return userConnectCode;
  const mostCommonConnectCode = await getMostCommonUser([]);
  return mostCommonConnectCode;
};

export const executeCallbackOnEachReplay = async (
  callback: (replay: Replay) => void,
) => {
  await replaysStore.iterate((replay: Replay, key) => callback(replay));
};
