import { BrowserWindow, app, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import { PRELOAD, VITE_DEV_SERVER_URL, INDEX_HTML } from "./vite_constants";
import path from "node:path";
import { PARSE_BATCH_SIZE } from "../worker/protocol";

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

/**
 * Parsing is CPU-bound, but each worker's peak footprint is the parsed frame data
 * — roughly 200MB for a 1.4MB replay and 300MB for a 9MB one — not the process
 * baseline. Measured on a 20-core machine over 150 replays, throughput knees well
 * before the core count does (4 workers 7.8s, 6 workers 6.1s, 8 workers 4.9s,
 * 15 workers 4.2s) while memory keeps climbing linearly, so the cap is memory's
 * call rather than the CPU's.
 */
const MAX_WORKERS = 6;

export const getNumberOfWorkers = (numberOfReplays: number) => {
  const workersByCore = Math.max(1, Math.min(NUM_CORES - 1, MAX_WORKERS));
  const workersByFileCount = Math.ceil(numberOfReplays / PARSE_BATCH_SIZE);
  return Math.max(1, Math.min(workersByCore, workersByFileCount));
};

export const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    title: "MeleeDex",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    show: false,
    webPreferences: {
      preload: PRELOAD,
    },
  });
  mainWindow.maximize();

  if (VITE_DEV_SERVER_URL) {
    // #298
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(INDEX_HTML);
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", () => {
    app.quit();
  });

  mainWindow.removeMenu();
};

export const destroyMainWindow = () => {
  mainWindow = null;
};
