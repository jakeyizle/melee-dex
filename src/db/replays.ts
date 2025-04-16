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

export const selectReplayCount = async () => {
  return await replaysStore.length();
};
