import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlippiGame } from "@slippi/slippi-js/node";
import { readFinalStocks } from "../../electron/worker/tailReader";

/**
 * The tail reader against the real `.slp` files in `testdata/`. Nothing is
 * mocked: the whole point of this module is that it reads bytes correctly, and
 * a fake file proves nothing about that.
 *
 * The property that matters most is in "damaged files": it must answer
 * correctly or not at all, never wrongly. A wrong answer here records the loser
 * as the winner of a game, silently, forever.
 */

const TESTDATA = path.resolve(__dirname, "../../testdata");
const replay = (name: string) => path.join(TESTDATA, name);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "meleedex-tail-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** Who the full parse says won, by counting the stocks each player lost. */
const winnerFromFullParse = (filePath: string) => {
  const stats = new SlippiGame(filePath).getStats();
  const lost = [0, 1].map(
    (index) =>
      stats?.stocks?.filter((s) => s.playerIndex === index && !!s.endFrame)
        .length ?? 0,
  );
  if (lost[0] < lost[1]) return 0;
  if (lost[1] < lost[0]) return 1;
  return null;
};

/** Who the tail says won, under the same stocks-only rule `tryGetWinner` uses. */
const winnerFromTail = (filePath: string) => {
  const stocks = readFinalStocks(filePath);
  const one = stocks?.find((s) => s.playerIndex === 0);
  const two = stocks?.find((s) => s.playerIndex === 1);
  if (!one || !two || one.stocksRemaining === two.stocksRemaining) return null;
  return one.stocksRemaining > two.stocksRemaining ? 0 : 1;
};

describe("readFinalStocks", () => {
  it("reads both players off the last frame", () => {
    expect(readFinalStocks(replay("Game_20200727T230003.slp"))).toEqual([
      {
        playerIndex: 0,
        isFollower: false,
        stocksRemaining: 1,
        percent: expect.closeTo(75, 0),
      },
      {
        playerIndex: 1,
        isFollower: false,
        stocksRemaining: 0,
        percent: expect.closeTo(163, 0),
      },
    ]);
  });

  // This one has no GAME_END event, so slippi-js's own tail extraction lands on
  // the wrong offset and returns nothing. Trying the shorter trailer layouts is
  // what gets it, and it is the only reason this module is more than a copy.
  it("reads a replay that ends without a GAME_END event", () => {
    const stocks = readFinalStocks(replay("Game_20250421T224653.slp"));

    expect(stocks?.map((s) => s.stocksRemaining)).toEqual([4, 3]);
  });

  it("agrees with the full parse about who won, across the whole library", () => {
    const files = fs
      .readdirSync(TESTDATA)
      .filter((name) => name.endsWith(".slp"));

    for (const name of files) {
      expect(winnerFromTail(replay(name)), name).toBe(
        winnerFromFullParse(replay(name)),
      );
    }
  });
});

describe("readFinalStocks on things that are not replays", () => {
  // Every one of these reaches the reader in practice: the watcher fires on
  // partial writes, and a replay directory holds whatever the user put in it.
  it("answers null rather than throwing", () => {
    expect(readFinalStocks(replay("does-not-exist.slp"))).toBeNull();
    expect(readFinalStocks(TESTDATA)).toBeNull();
    expect(
      readFinalStocks(path.resolve(__dirname, "../../package.json")),
    ).toBeNull();
  });

  it("answers null for an empty file", () => {
    const empty = path.join(tmp, "empty.slp");
    fs.writeFileSync(empty, "");

    expect(readFinalStocks(empty)).toBeNull();
  });
});

describe("readFinalStocks on damaged files", () => {
  // A file cut short still has a valid header claiming the original length, so
  // the computed offset points past the end. The reader must notice rather than
  // read whatever happens to be there and call it a stock count.
  it("never names a winner the full parse disagrees with", () => {
    const source = replay("Game_20250505T223105.slp");
    const full = fs.readFileSync(source);
    const cut = path.join(tmp, "truncated.slp");

    for (const bytes of [100, 1_000, 100_000, 1_000_000, 6_000_000]) {
      fs.writeFileSync(cut, full.subarray(0, full.length - bytes));
      const fromTail = winnerFromTail(cut);

      // Declining is always allowed. Answering is only allowed if it is right.
      if (fromTail !== null) {
        expect(fromTail, `truncated by ${bytes} bytes`).toBe(
          winnerFromFullParse(cut),
        );
      }
    }
  });

  it("answers null for a file of random bytes", () => {
    const noise = path.join(tmp, "noise.slp");
    fs.writeFileSync(noise, Buffer.alloc(50_000, 0x38));

    expect(readFinalStocks(noise)).toBeNull();
  });
});
