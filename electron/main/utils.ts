import { BrowserWindow, app, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import {
  WORKER_URL,
  WORKER_HTML,
  PRELOAD,
  VITE_DEV_SERVER_URL,
  INDEX_HTML,
} from "./vite_constants";
import path from "node:path";
import electronUpdater, { type AppUpdater } from "electron-updater";
import log from "electron-log";

const NUM_CORES = os.cpus().length;
export type ReplayFile = { path: string; name: string };

export let mainWindow: BrowserWindow | null = null;

async function getFiles(path = "./") {
  // add "/" to the end of path if not present
  if (path[path.length - 1] !== "/") {
    path += "/";
  }
  const entries = fs.readdirSync(path, {
    withFileTypes: true,
  });
  // Get files within the current directory and add a path key to the file objects
  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => ({
      ...file,
      path: path + file.name,
    }));

  // Get folders within the current directory
  const folders = entries.filter((folder) => folder.isDirectory());
  /*
        Add the found files within the subdirectory to the files array by calling the
        current function itself
      */
  for (const folder of folders)
    files.push(...(await getFiles(`${path}${folder.name}/`)));

  return files;
}

export async function getReplayFiles(path: string | undefined) {
  let files = await getFiles(path);
  //ends in .slp
  let regExp = /.*\.slp$/;
  let replays = files.filter((file) => regExp.test(file.name));
  return replays;
}

export const getNumberOfWorkers = (numberOfReplays: number) => {
  const renderersByCore = Math.floor(NUM_CORES / 4);
  const minRenderersByCore = Math.max(10, renderersByCore);

  const renderersByFileCount = Math.ceil(numberOfReplays / 10);

  const numRenderers = Math.min(minRenderersByCore, renderersByFileCount);
  return numRenderers;
};

export const getBatchSize = (
  numberOfReplays: number,
  numberOfWorkers: number,
) => {
  const maxBatchSize = 50;
  const minBatchSize = 5;
  const batchSize =
    numberOfWorkers > numberOfReplays ? minBatchSize : maxBatchSize;
  return batchSize;
};

export const createInvisWindow = () => {
  let invisWindow = new BrowserWindow({
    show: !app.isPackaged,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    invisWindow.loadURL(WORKER_URL);
    //react dev tools does not appreciate other windows having dev tools open
    invisWindow.webContents.openDevTools();
  } else {
    invisWindow.loadFile(WORKER_HTML);
  }

  invisWindow.webContents.once("did-finish-load", () => {
    invisWindow.webContents.send("start-load");
  });

  return invisWindow.webContents;
};

export const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    title: "MeleeDex",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload: PRELOAD,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(INDEX_HTML);
  }

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", () => {
    app.quit();
  });

  mainWindow.removeMenu();
  // Auto update
  const autoUpdater = getAutoUpdater();

  autoUpdater.on("update-available", (info) => {
    console.log("⬇️ Update available:", info.version);
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("✅ Update downloaded:", info.version);

    mainWindow?.webContents.send("update-ready");
  });
};

export const destroyMainWindow = () => {
  mainWindow = null;
};

function getAutoUpdater(): AppUpdater {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater;
  autoUpdater.logger = log;
  log.transports.file.level = "info";

  return autoUpdater;
}
