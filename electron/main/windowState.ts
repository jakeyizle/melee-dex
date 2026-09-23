import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, screen } from "electron";

export type WindowState = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
};

/**
 * Below this the live view has nowhere to put two columns of cards, and the
 * stage table starts wrapping into something unreadable.
 */
export const MIN_WIDTH = 940;
export const MIN_HEIGHT = 640;

const DEFAULT_STATE: WindowState = {
  width: 1440,
  height: 900,
  // Maximized on a first run, which is what the app always used to do.
  isMaximized: true,
};

const stateFile = () =>
  path.join(app.getPath("userData"), "window-state.json");

const isVisibleOnSomeScreen = (state: WindowState) => {
  if (state.x === undefined || state.y === undefined) return false;
  // A window restored onto a monitor that is no longer attached is invisible
  // and unreachable, which looks exactly like the app failing to start.
  return screen.getAllDisplays().some(({ workArea }) => {
    return (
      state.x! >= workArea.x - 16 &&
      state.y! >= workArea.y - 16 &&
      state.x! < workArea.x + workArea.width &&
      state.y! < workArea.y + workArea.height
    );
  });
};

/** The saved size and position, or sensible defaults for a first run. */
export const loadWindowState = (): WindowState => {
  let saved: Partial<WindowState>;
  try {
    saved = JSON.parse(fs.readFileSync(stateFile(), "utf-8"));
  } catch {
    // No file yet, or it was corrupted. Neither is worth reporting.
    return DEFAULT_STATE;
  }

  const state: WindowState = {
    width: Math.max(
      MIN_WIDTH,
      Number(saved.width) || DEFAULT_STATE.width,
    ),
    height: Math.max(
      MIN_HEIGHT,
      Number(saved.height) || DEFAULT_STATE.height,
    ),
    x: typeof saved.x === "number" ? saved.x : undefined,
    y: typeof saved.y === "number" ? saved.y : undefined,
    isMaximized: saved.isMaximized !== false,
  };

  if (!isVisibleOnSomeScreen(state)) {
    return { ...state, x: undefined, y: undefined };
  }
  return state;
};

/**
 * Records where the window was. `getNormalBounds` rather than `getBounds`, so a
 * maximized window remembers the size to go back to rather than the size of the
 * screen it was maximized on.
 */
export const saveWindowState = (window: BrowserWindow) => {
  try {
    const bounds = window.getNormalBounds();
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: window.isMaximized(),
    };
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {
    // Losing the window position is not worth failing a shutdown over.
  }
};
