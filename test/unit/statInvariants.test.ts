import { describe, it, expect } from "vitest";
import {
  buildStats,
  applyReplayToStats,
  createEmptyFullStats,
} from "@/utils/statUtils";
import { Replay, ReplayMode } from "@/db/replays";
import { FullStats, Stat, Stats } from "@/types";
import { makeReplay, makePlayer, USER } from "../helpers/makeReplay";

/**
 * Properties that must hold for *any* library, checked over generated ones.
 *
 * The existing "incremental equals batch" test is the suite's best, but it buys
 * less than it looks like: `buildStats`, `getStats` and `updateStatsWithReplay`
 * all funnel through `applyReplayToStats`, so it can only catch a path calling
 * the core differently — never a bug inside the core, which both sides would
 * reproduce identically. These assert what the numbers themselves have to
 * satisfy, so a shared bug has nowhere to hide.
 */

/** Deterministic PRNG, so a failure names a seed that reproduces it exactly. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CHARACTERS = ["0", "2", "9", "13", "19", "20", "25"];
const STAGES = ["2", "3", "8", "28", "31", "32"];
const OPPONENTS = ["AAAA#111", "BBBB#222", "CCCC#333", "DDDD#444"];
const NAMES = ["alpha", "beta", "", "gamma"];

const randomLibrary = (seed: number, size: number): Replay[] => {
  const random = mulberry32(seed);
  const pick = <T>(items: T[]): T =>
    items[Math.floor(random() * items.length)];

  return Array.from({ length: size }, (_unused, index) => {
    const opponent = pick(OPPONENTS);
    const userWon = random() < 0.5;
    // A third of libraries also contain games the user is not in at all, which
    // the fold has to skip without disturbing anything.
    const userIsIn = random() > 0.1;
    const player = userIsIn ? USER : pick(OPPONENTS);

    return makeReplay({
      name: `Seed${seed}_Game${index}.slp`,
      date: new Date(Date.UTC(2025, 0, 1 + (index % 300))).toISOString(),
      stageId: pick(STAGES),
      mode: (random() < 0.3 ? "ranked" : "unranked") as ReplayMode,
      players: [
        makePlayer(player, pick(CHARACTERS)),
        { ...makePlayer(opponent, pick(CHARACTERS)), name: pick(NAMES) },
      ],
      winnerConnectCode: userWon ? player : opponent,
    });
  });
};

const SEEDS = [1, 7, 42, 1337, 99999];

const everyStatIn = (stats: Stats): Stat[] => [
  stats.overallStat,
  ...stats.modeStats,
  ...stats.stageStats,
  ...stats.matchupStats,
  ...stats.matchupAndStageStats,
];

const sumOf = (rows: Stat[]) =>
  rows.reduce((total, row) => total + row.totalCount, 0);

/** Asserts everything that must be true of one `Stats`, whoever it belongs to. */
const checkStats = (stats: Stats, label: string) => {
  for (const stat of everyStatIn(stats)) {
    expect(stat.winCount + stat.lossCount, `${label}: wins + losses`).toBe(
      stat.totalCount,
    );
    expect(stat.winCount, `${label}: wins are not negative`).toBeGreaterThanOrEqual(0);
    expect(stat.lossCount, `${label}: losses are not negative`).toBeGreaterThanOrEqual(0);

    const expectedRate =
      stat.totalCount === 0
        ? 0
        : Math.round((stat.winCount / stat.totalCount) * 100 * 10) / 10;
    expect(stat.winRate, `${label}: win rate matches the counts`).toBe(
      expectedRate,
    );
  }

  const total = stats.overallStat.totalCount;
  // Every bucket partitions the same set of games, so each must re-sum to it.
  expect(sumOf(stats.modeStats), `${label}: modes partition the games`).toBe(total);
  expect(sumOf(stats.stageStats), `${label}: stages partition the games`).toBe(total);
  expect(sumOf(stats.matchupStats), `${label}: matchups partition the games`).toBe(total);
  expect(
    sumOf(stats.matchupAndStageStats),
    `${label}: matchup-and-stage partitions the games`,
  ).toBe(total);

  // One row per key, never two.
  const keyOf = {
    mode: (row: { mode: ReplayMode }) => row.mode,
    stage: (row: { stageId: string }) => row.stageId,
    matchup: (row: { userCharacterId: string; opponentCharacterId: string }) =>
      `${row.userCharacterId}v${row.opponentCharacterId}`,
    matchupAndStage: (row: {
      userCharacterId: string;
      opponentCharacterId: string;
      stageId: string;
    }) => `${row.userCharacterId}v${row.opponentCharacterId}@${row.stageId}`,
  };
  const unique = <T>(rows: T[], key: (row: T) => string) =>
    new Set(rows.map(key)).size === rows.length;

  expect(unique(stats.modeStats, keyOf.mode), `${label}: one row per mode`).toBe(true);
  expect(unique(stats.stageStats, keyOf.stage), `${label}: one row per stage`).toBe(true);
  expect(unique(stats.matchupStats, keyOf.matchup), `${label}: one row per matchup`).toBe(true);
  expect(
    unique(stats.matchupAndStageStats, keyOf.matchupAndStage),
    `${label}: one row per matchup and stage`,
  ).toBe(true);
};

const checkFullStats = (fullStats: FullStats, label: string) => {
  checkStats(fullStats.stats, `${label} global`);

  // The index and the array are two views of one set of objects. Nothing may
  // add to one without the other — a miss here means duplicate opponent rows
  // and a record silently split in two.
  expect(fullStats.opponentIndex.size, `${label}: index covers every opponent`).toBe(
    fullStats.opponentSpecificStats.length,
  );
  for (const opponentStats of fullStats.opponentSpecificStats) {
    expect(
      fullStats.opponentIndex.get(opponentStats.opponentConnectCode),
      `${label}: index points at the very same object`,
    ).toBe(opponentStats);
  }
  for (const [connectCode, opponentStats] of fullStats.opponentIndex) {
    expect(opponentStats.opponentConnectCode, `${label}: index is keyed correctly`).toBe(
      connectCode,
    );
  }

  let opponentTotal = 0;
  for (const opponentStats of fullStats.opponentSpecificStats) {
    const label2 = `${label} vs ${opponentStats.opponentConnectCode}`;
    checkStats(opponentStats, label2);
    opponentTotal += opponentStats.overallStat.totalCount;

    expect(
      new Date(opponentStats.firstMatchDate).getTime(),
      `${label2}: first match is not after the last`,
    ).toBeLessThanOrEqual(new Date(opponentStats.lastMatchDate).getTime());

    expect(
      new Set(opponentStats.knownNames).size,
      `${label2}: names are not repeated`,
    ).toBe(opponentStats.knownNames.length);
    expect(
      opponentStats.knownNames.includes(""),
      `${label2}: a blank name is not an alias`,
    ).toBe(false);

    expect(
      opponentStats.opponentConnectCode,
      `${label2}: the user is never their own opponent`,
    ).not.toBe(USER);
  }

  // Per-opponent records partition the games too.
  expect(opponentTotal, `${label}: opponents partition the games`).toBe(
    fullStats.stats.overallStat.totalCount,
  );
};

describe("stat invariants over generated libraries", () => {
  it.each(SEEDS)("hold for a library built in one pass (seed %i)", (seed) => {
    const stats = buildStats(randomLibrary(seed, 120), USER);

    checkFullStats(stats, `seed ${seed}`);
    expect(stats.stats.overallStat.totalCount).toBeGreaterThan(0);
  });

  it.each(SEEDS)("hold after folding one replay at a time (seed %i)", (seed) => {
    const library = randomLibrary(seed, 120);
    const stats = createEmptyFullStats();

    for (const replay of library) {
      applyReplayToStats(stats, replay, USER);
    }

    checkFullStats(stats, `seed ${seed} incremental`);
  });

  // The live path folds into stats that already exist, which is the case the
  // batch path never exercises.
  it.each(SEEDS)("hold when a live game lands on existing stats (seed %i)", (seed) => {
    const library = randomLibrary(seed, 120);
    const stats = buildStats(library.slice(0, 100), USER);

    for (const replay of library.slice(100)) {
      applyReplayToStats(stats, replay, USER);
      checkFullStats(stats, `seed ${seed} live`);
    }
  });

  it("hold for an empty library", () => {
    checkFullStats(createEmptyFullStats(), "empty");
    checkFullStats(buildStats([], USER), "built empty");
  });

  it("hold for a library the user is in none of", () => {
    const stats = buildStats(
      [
        makeReplay({
          players: [makePlayer("AAAA#111", "2"), makePlayer("BBBB#222", "9")],
          winnerConnectCode: "AAAA#111",
        }),
      ],
      USER,
    );

    checkFullStats(stats, "user absent");
    expect(stats.stats.overallStat.totalCount).toBe(0);
    expect(stats.opponentIndex.size).toBe(0);
  });
});
