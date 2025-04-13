import { replaysStore, badReplaysStore } from "./stores";

export type ReplayPlayer = {
    connectCode: string;
    name: string;
    characterId: string;
}

export type Replay = {
    name: string;
    path: string;
    date: string;
    players: ReplayPlayer[];
    winnerConnectCode: string;
}

export const getReplayNames = async () => {
    const badNames = await badReplaysStore.keys();
    const goodNames = await replaysStore.keys();
    return [...goodNames, ...badNames];
}

export const insertReplay = async (replay: Replay) => {
    await replaysStore.setItem(replay.name, replay);
}

export const insertBadReplay = async ({name, path}: { name: string, path: string }) => {
    await badReplaysStore.setItem(name, path);
}