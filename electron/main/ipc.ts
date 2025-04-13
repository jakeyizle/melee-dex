import { ipcMain, dialog, BrowserWindow, } from "electron";
import { createInvisWindow, getNumberOfRenderers, getReplayFiles, splitReplaysIntoChunks, mainWindow } from "./utils";


ipcMain.handle('select-directory', async (event, arg) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) {
      return null        
    } else {
        if (!filePaths[0]) return null
        return filePaths[0];
    }
})

let isLoadingReplays = false;
let totalReplaysToLoad = 0;
let currentReplaysLoaded = 0;

ipcMain.handle('begin-loading-replays', async (_event, args: { replayDirectory: string | undefined, existingReplayNames: string[], isFastLoad: boolean}) => {
    const { replayDirectory, existingReplayNames, isFastLoad} = args;
    if (!replayDirectory) return;
    if (isLoadingReplays) return;
    isLoadingReplays = true;

    const replays = await getReplayFiles(replayDirectory);
    const newReplays = replays.filter(replay => !existingReplayNames.includes(replay.name));

    if (newReplays.length === 0) {
        isLoadingReplays = false;
        mainWindow?.webContents.send('end-loading-replays');
        return;
    }

    const numberOfRenderers = getNumberOfRenderers(newReplays.length, isFastLoad);    
    const replayChunks = splitReplaysIntoChunks(newReplays, numberOfRenderers);
    totalReplaysToLoad = newReplays.length;
    currentReplaysLoaded = 0;
    for (const chunk of replayChunks) {
        createInvisWindow(chunk);
    }
})

ipcMain.handle('worker-finished', (event) => {
    const worker = event.sender;    
    worker.close();
    worker.on('destroyed', () => {
        const openWindowCount = BrowserWindow.getAllWindows().length;
        if (openWindowCount === 2) {
            isLoadingReplays = false;
            mainWindow?.webContents.send('end-loading-replays');
        }
    })
})

ipcMain.handle('replay-loaded', (event) => {
    currentReplaysLoaded++;
    mainWindow?.webContents.send('update-replay-load-progress', { totalReplaysToLoad, currentReplaysLoaded });
})

