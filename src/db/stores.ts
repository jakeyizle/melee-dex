import localforage from "localforage";

const settingsStore = localforage.createInstance({
  name: "db",
  storeName: "settings",
});

const replaysStore = localforage.createInstance({
  name: "db",
  storeName: "replays",
});

const badReplaysStore = localforage.createInstance({
  name: "db",
  storeName: "badReplays",
});

const dropDB = async () => await localforage.dropInstance({ name: "db" });

export { settingsStore, replaysStore, badReplaysStore, dropDB };
