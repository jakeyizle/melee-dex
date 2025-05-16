import { settingsStore } from "./stores";
type SETTINGS_KEYS = "replayDirectory" | "username";

export const selectSetting = async (key: SETTINGS_KEYS): Promise<string> => {
  return (await settingsStore.getItem(key)) || "";
};

export const selectAllSettings = async () => {
  const replayDirectory = await selectSetting("replayDirectory");
  const username = await selectSetting("username");
  return { replayDirectory, username };
};

export const upsertSetting = async (key: SETTINGS_KEYS, value: string) => {
  await settingsStore.setItem(key, value);
};

export const upsertSettings = async (
  settings: { key: SETTINGS_KEYS; value: string }[],
) => {
  for (const setting of settings) {
    await upsertSetting(setting.key, setting.value);
  }
};

export const updateUsernameIfEmpty = async (username: string) => {
  const currentUsername = await selectSetting("username");
  if (!currentUsername) upsertSetting("username", username.toUpperCase());
  return await selectSetting("username");
};
