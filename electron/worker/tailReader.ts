import fs from "node:fs";
import { Command } from "@slippi/slippi-js/node";
import type { FinalStock } from "../../src/replayParsing";

/**
 * Reads the final frame's stock counts straight out of the end of a `.slp`,
 * without parsing the game.
 *
 * This exists because `getStats()` is the most expensive thing in the import
 * path — 158ms on the smallest replay in `testdata/`, 1216ms and ~50MB on the
 * largest — and `tryGetWinner` only needs it to answer "who had more stocks
 * left". Practically all of that cost is the frame walk, not the stat
 * computers, so the only way to avoid it is to not walk the frames. Reading the
 * tail instead takes about 0.3ms.
 *
 * slippi-js does this internally and would save us the trouble, but it keeps
 * the helper private and declines to use the result for exactly the replays we
 * need it for — see "The upstream bugs" in `src/CLAUDE.md`.
 *
 * The cost of living here is that this file, alone in the codebase, knows the
 * `.slp` byte layout. It is deliberately the smallest amount of that knowledge
 * that answers the question: where the raw event block starts, how big each
 * event is, and four fields of one event type.
 */

/** The event payloads header, which declares how big every other event is. */
const EVENT_PAYLOADS = 0x35;

// Field offsets within a POST_FRAME_UPDATE payload. These have been fixed since
// the format was introduced — new fields are only ever appended — which is what
// makes reading them by hand defensible.
const FRAME_NUMBER = 0x1;
const PLAYER_INDEX = 0x5;
const IS_FOLLOWER = 0x6;
const PERCENT = 0x16;
const STOCKS_REMAINING = 0x21;

type SlpLayout = {
  rawDataPosition: number;
  rawDataLength: number;
  messageSizes: Record<number, number>;
};

/**
 * Mirrors slippi-js's own `getRawDataPosition`: a file starting with
 * `GAME_START` is a bare event stream, one starting with `{` has the 15-byte
 * ubjson header in front of it, and anything else is treated as bare rather
 * than rejected.
 */
const getRawDataPosition = (header: Buffer): number => {
  if (header[0] === Command.GAME_START) return 0;
  if (header[0] !== "{".charCodeAt(0)) return 0;
  return 15;
};

const readLayout = (fd: number, fileSize: number): SlpLayout | null => {
  const header = Buffer.alloc(64);
  fs.readSync(fd, header, 0, header.length, 0);
  const rawDataPosition = getRawDataPosition(header);

  // A length of 0 means the writer never came back to fill it in, which happens
  // for a game that was interrupted. slippi-js treats the rest of the file as
  // the raw block in that case, and so do we.
  const declaredLength =
    rawDataPosition === 0 ? 0 : header.readUInt32BE(rawDataPosition - 4);
  const rawDataLength =
    rawDataPosition === 0 || declaredLength <= 0
      ? fileSize - rawDataPosition
      : declaredLength;

  const messageSizes: Record<number, number> = {};
  if (rawDataPosition === 0) {
    // The pre-payloads format had fixed sizes, the same four slippi-js hardcodes.
    messageSizes[Command.GAME_START] = 0x140;
    messageSizes[Command.PRE_FRAME_UPDATE] = 0x6;
    messageSizes[Command.POST_FRAME_UPDATE] = 0x46;
    messageSizes[Command.GAME_END] = 0x1;
    return { rawDataPosition, rawDataLength, messageSizes };
  }

  if (header[rawDataPosition] !== EVENT_PAYLOADS) return null;
  const payloadLength = header[rawDataPosition + 1];
  if (payloadLength < 4) return null;

  const sizes = Buffer.alloc(payloadLength - 1);
  fs.readSync(fd, sizes, 0, sizes.length, rawDataPosition + 2);
  for (let i = 0; i + 2 < sizes.length; i += 3) {
    messageSizes[sizes[i]] = sizes.readUInt16BE(i + 1);
  }
  return { rawDataPosition, rawDataLength, messageSizes };
};

/**
 * Walks backwards from `end` collecting POST_FRAME_UPDATEs that belong to one
 * frame, stopping as soon as a read is not one. Returns an empty array when the
 * offset does not land on a message boundary, which is how a wrong guess at the
 * trailer layout fails.
 */
const readUpdatesEndingAt = (
  fd: number,
  end: number,
  floor: number,
  size: number,
): FinalStock[] => {
  const updates: FinalStock[] = [];
  const buffer = Buffer.alloc(size);
  let frameNumber: number | null = null;

  for (let position = end; position >= floor; position -= size) {
    const read = fs.readSync(fd, buffer, 0, size, position);
    if (read !== size) break;
    if (buffer[0] !== Command.POST_FRAME_UPDATE) break;

    const frame = buffer.readInt32BE(FRAME_NUMBER);
    if (frameNumber === null) frameNumber = frame;
    else if (frame !== frameNumber) break;

    updates.unshift({
      playerIndex: buffer.readUInt8(PLAYER_INDEX),
      isFollower: Boolean(buffer.readUInt8(IS_FOLLOWER)),
      percent: buffer.readFloatBE(PERCENT),
      stocksRemaining: buffer.readUInt8(STOCKS_REMAINING),
    });
  }
  return updates;
};

/**
 * The last frame's post-frame updates, or `null` if they cannot be read.
 *
 * `null` is the only failure: a caller that gets it falls back to the full
 * parse, so being unable to answer costs time and nothing else. Answering
 * *wrongly* would silently record the loser as the winner, so every uncertain
 * case returns `null` instead.
 */
export const readFinalStocks = (filePath: string): FinalStock[] | null => {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const fileSize = fs.fstatSync(fd).size;
    const layout = readLayout(fd, fileSize);
    if (!layout) return null;

    const { rawDataPosition, rawDataLength, messageSizes } = layout;
    const postFramePayload = messageSizes[Command.POST_FRAME_UPDATE];
    if (!postFramePayload) return null;

    // Every event is its payload plus the one-byte command.
    const postFrameSize = postFramePayload + 1;
    const withCommand = (payload: number | undefined) =>
      payload ? payload + 1 : 0;
    const gameEnd = withCommand(messageSizes[Command.GAME_END]);
    const bookend = withCommand(messageSizes[Command.FRAME_BOOKEND]);

    // A complete replay ends ... POST_FRAME_UPDATE | FRAME_BOOKEND | GAME_END,
    // but a game that was interrupted is missing the tail events even though the
    // header still declares their sizes. Assuming the complete layout is what
    // makes slippi-js return nothing for those files, so try the shorter ones
    // too and take the first that lands on a real message boundary.
    const trailers = [gameEnd + bookend, bookend, 0, gameEnd];
    const rawDataEnd = rawDataPosition + rawDataLength;

    for (const trailer of trailers) {
      const updates = readUpdatesEndingAt(
        fd,
        rawDataEnd - trailer - postFrameSize,
        rawDataPosition,
        postFrameSize,
      );
      const active = updates.filter((update) => !update.isFollower);
      if (active.length >= 2) return active;
    }
    return null;
  } catch (_e) {
    // A missing file, a directory, a partial write — all just "cannot answer".
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};
