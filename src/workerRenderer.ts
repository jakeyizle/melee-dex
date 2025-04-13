import { ipcRenderer } from "electron";
import { SlippiGame } from "@slippi/slippi-js";

document.addEventListener("DOMContentLoaded", function(event) {
    console.log(123123123)
    const game = new SlippiGame("D:\\SlippiReplays\\2020-07\\Game_20200727T231611.slp")
    console.log(game.getSettings())
    console.log(game.getStats())
    console.log(game.getWinners())
    console.log(game.getMetadata())

});

ipcRenderer.invoke('poop')