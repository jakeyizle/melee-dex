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

export { settingsStore, replaysStore, badReplaysStore };