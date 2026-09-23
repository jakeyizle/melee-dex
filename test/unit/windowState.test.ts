import { describe, it, expect, beforeEach, vi } from "vitest";

const state = vi.hoisted(() => ({
  file: null as string | null,
  written: null as string | null,
  displays: [{ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }],
}));

vi.mock("node:fs", () => {
  const fs = {
    readFileSync: vi.fn(() => {
      if (state.file === null) throw new Error("ENOENT");
      return state.file;
    }),
    writeFileSync: vi.fn((_path: string, contents: string) => {
      state.written = contents;
    }),
  };
  return { default: fs, ...fs };
});

vi.mock("electron", () => ({
  app: { getPath: () => "C:/userData" },
  screen: { getAllDisplays: () => state.displays },
  BrowserWindow: class {},
}));

const { loadWindowState, saveWindowState, MIN_WIDTH, MIN_HEIGHT } =
  await import("../../electron/main/windowState");

const saved = (value: unknown) => {
  state.file = JSON.stringify(value);
};

const fakeWindow = (bounds: {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized?: boolean;
}) =>
  ({
    getNormalBounds: () => ({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    }),
    isMaximized: () => bounds.isMaximized ?? false,
  }) as any;

beforeEach(() => {
  state.file = null;
  state.written = null;
  state.displays = [{ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }];
});

describe("loadWindowState", () => {
  // The app used to maximize unconditionally, so a first run has to keep doing
  // that rather than opening in a small window nobody asked for.
  it("maximizes on a first run, when there is nothing saved", () => {
    expect(loadWindowState()).toMatchObject({ isMaximized: true });
  });

  it("restores a saved size and position", () => {
    saved({ width: 1280, height: 800, x: 100, y: 50, isMaximized: false });

    expect(loadWindowState()).toEqual({
      width: 1280,
      height: 800,
      x: 100,
      y: 50,
      isMaximized: false,
    });
  });

  it("falls back to defaults when the file is corrupt", () => {
    state.file = "{ not json";

    expect(loadWindowState()).toMatchObject({ isMaximized: true });
  });

  // A window smaller than the minimum cannot lay the cards out, and BrowserWindow
  // would clamp it anyway — better to agree with it up front.
  it("never restores a window smaller than the minimum", () => {
    saved({ width: 200, height: 100, x: 0, y: 0, isMaximized: false });

    const restored = loadWindowState();

    expect(restored.width).toBe(MIN_WIDTH);
    expect(restored.height).toBe(MIN_HEIGHT);
  });

  it("ignores sizes that are not numbers", () => {
    saved({ width: "wide", height: null, isMaximized: false });

    const restored = loadWindowState();

    expect(restored.width).toBeGreaterThanOrEqual(MIN_WIDTH);
    expect(restored.height).toBeGreaterThanOrEqual(MIN_HEIGHT);
  });

  // The failure this prevents looks exactly like the app not starting: the
  // window opens on a monitor that is no longer there, so nothing appears.
  it("drops a position that is off every attached screen", () => {
    saved({ width: 1280, height: 800, x: 3000, y: 1800, isMaximized: false });

    const restored = loadWindowState();

    expect(restored.x).toBeUndefined();
    expect(restored.y).toBeUndefined();
    expect(restored.width).toBe(1280);
  });

  it("keeps a position on a second monitor that is still attached", () => {
    state.displays = [
      { workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
      { workArea: { x: 1920, y: 0, width: 1920, height: 1040 } },
    ];
    saved({ width: 1280, height: 800, x: 2200, y: 100, isMaximized: false });

    expect(loadWindowState()).toMatchObject({ x: 2200, y: 100 });
  });

  it("keeps a window nudged slightly above its screen", () => {
    saved({ width: 1280, height: 800, x: 0, y: -8, isMaximized: false });

    expect(loadWindowState()).toMatchObject({ y: -8 });
  });
});

describe("saveWindowState", () => {
  it("records where the window was", () => {
    saveWindowState(fakeWindow({ width: 1280, height: 800, x: 20, y: 30 }));

    expect(JSON.parse(state.written!)).toEqual({
      width: 1280,
      height: 800,
      x: 20,
      y: 30,
      isMaximized: false,
    });
  });

  // `getNormalBounds`, not `getBounds`: a maximized window has to remember the
  // size to restore *to*, not the size of the screen it was maximized on.
  it("remembers the un-maximized size of a maximized window", () => {
    saveWindowState(
      fakeWindow({
        width: 1024,
        height: 768,
        x: 40,
        y: 40,
        isMaximized: true,
      }),
    );

    expect(JSON.parse(state.written!)).toMatchObject({
      width: 1024,
      height: 768,
      isMaximized: true,
    });
  });

  it("round-trips through load", () => {
    saveWindowState(
      fakeWindow({ width: 1100, height: 700, x: 5, y: 15, isMaximized: true }),
    );
    state.file = state.written;

    expect(loadWindowState()).toEqual({
      width: 1100,
      height: 700,
      x: 5,
      y: 15,
      isMaximized: true,
    });
  });

  // Losing the window position is not worth failing a shutdown over.
  it("does not throw when the file cannot be written", () => {
    const window = {
      getNormalBounds: () => {
        throw new Error("window already destroyed");
      },
      isMaximized: () => false,
    } as any;

    expect(() => saveWindowState(window)).not.toThrow();
  });
});
