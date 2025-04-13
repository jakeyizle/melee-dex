import { settingsStore } from "./stores";
type SETTINGS_KEYS = "replayDirectory" | "username" | "isFastLoad"

export const getSettings = async () => {
    const replayDirectory = await getSetting('replayDirectory');
    const username = await getSetting('username');
    const isFastLoad = await getSetting('isFastLoad');
    return { replayDirectory, username, isFastLoad };
}

export const setSetting = async (key: SETTINGS_KEYS, value: string) => {
    await settingsStore.setItem(key, value);
}

export const getSetting = async (key: SETTINGS_KEYS): Promise<string> => {
    return await settingsStore.getItem(key) || '';
}