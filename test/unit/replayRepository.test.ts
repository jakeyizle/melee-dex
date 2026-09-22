import { describe, it, expect } from "vitest";
import {
  createReplayRepository,
  LATEST_REPLAY_KEY,
  Replay,
} from "@/db/replayRepository";
import { createSettingsRepository } from "@/db/settingsRepository";
import { createInMemoryStore } from "../helpers/inMemoryStore";
import { makeReplay, makePlayer, USER, OPPONENT } from "../helpers/makeReplay";

const THIRD_PLAYER = "THRD#003";

const setup = (seed: { replays?: Replay[]; username?: string } = {}) => {
  const replaysStore = createInMemoryStore();
  const badReplaysStore = createInMemoryStore();
  const settingsStore = createInMemoryStore(
    seed.username ? { username: seed.username } : {},
  );
  const settings = createSettingsRepository(settingsStore);
  const repo = createReplayRepository(
    { replaysStore, badReplaysStore },
    settings,
  );
  return { repo, settings, replaysStore, badReplaysStore, settingsStore };
};

const seedReplays = async (
  repo: ReturnType<typeof setup>["repo"],
  replays: Replay[],
) => {
  for (const replay of replays) await repo.insertReplay(replay);
};

describe("storing and retrieving replays", () => {
  it("stores a replay under its filename and remembers it as the latest", async () => {
    const { repo } = setup();
    const replay = makeReplay({ name: "Game_A.slp" });

    await repo.insertReplay(replay);

    expect(await repo.selectLatestReplay()).toEqual(replay);
  });

  it("treats the most recently inserted replay as the latest", async () => {
    const { repo } = setup();
    const first = makeReplay({ name: "Game_A.slp" });
    const second = makeReplay({ name: "Game_B.slp" });

    await repo.insertReplay(first);
    await repo.insertReplay(second);

    expect(await repo.selectLatestReplay()).toEqual(second);
  });

  it("has no latest replay when nothing has been stored", async () => {
    const { repo } = setup();

    expect(await repo.selectLatestReplay()).toBeNull();
  });

  it("lists the names of both good and rejected replays", async () => {
    const { repo } = setup();
    await repo.insertReplay(makeReplay({ name: "Good.slp" }));
    await repo.insertBadReplay({ name: "Bad.slp", path: "C:/r/Bad.slp" });

    const names = await repo.selectAllReplayNames();

    expect(names).toContain("Good.slp");
    expect(names).toContain("Bad.slp");
  });

  it("counts rejected replays separately", async () => {
    const { repo } = setup();
    await repo.insertBadReplay({ name: "Bad1.slp", path: "C:/r/Bad1.slp" });
    await repo.insertBadReplay({ name: "Bad2.slp", path: "C:/r/Bad2.slp" });

    expect(await repo.selectBadReplayCount()).toBe(2);
  });

  // BUG (see src/CLAUDE.md "Known behavior quirks" #3): the "latestReplayKey"
  // pointer is stored inside the replays store, so it is counted as if it were
  // a replay. The count is always one higher than the number of replays.
  it("over-counts replays by one because the latest-replay pointer is stored alongside them", async () => {
    const { repo } = setup();
    await seedReplays(repo, [makeReplay(), makeReplay()]);

    expect(await repo.selectReplayCount()).toBe(3);
  });

  // BUG (same root cause, quirk #4): iteration yields the pointer's string value
  // as though it were a Replay. Every consumer must tolerate it — which is why
  // the stat code reaches for `replay.players?.` rather than `replay.players.`.
  it("hands the latest-replay pointer to callers iterating replays", async () => {
    const { repo } = setup();
    await seedReplays(repo, [makeReplay({ name: "Game_A.slp" })]);

    const seen: unknown[] = [];
    // The callback must not return a value: localforage (and the in-memory fake)
    // treat a non-undefined return as an early exit from the iteration.
    await repo.executeCallbackOnEachReplay((replay) => {
      seen.push(replay);
    });

    expect(seen).toHaveLength(2);
    expect(seen).toContain("Game_A.slp");
  });
});

describe("working out who the user is", () => {
  it("picks whichever candidate appears in more stored replays", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
      makeReplay({
        players: [makePlayer(OPPONENT, "0"), makePlayer(THIRD_PLAYER, "9")],
      }),
    ]);

    expect(await repo.getMostCommonUser([OPPONENT, USER])).toBe(USER);
  });

  it("falls back to the most frequent player overall when neither candidate is known", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    expect(await repo.getMostCommonUser(["NONE#000", "ALSO#000"])).toBe(USER);
  });

  // BUG (quirk #6): the comment in determineUserBasedOnLiveGame says "if tied,
  // return first player", but the ternary returns possibleUsers[1] on a tie.
  it("returns the second candidate when both appear equally often", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
    ]);

    expect(await repo.getMostCommonUser([USER, OPPONENT])).toBe(OPPONENT);
  });

  // BUG (quirk #5): with an empty store, Math.max(...[]) is -Infinity, nothing
  // matches it, and the function returns undefined despite promising a string.
  it("returns undefined when there are no replays at all", async () => {
    const { repo } = setup();

    expect(await repo.getMostCommonUser([])).toBeUndefined();
  });
});

describe("determineUserBasedOnLiveGame", () => {
  it("uses the configured username when that player is in the live game", async () => {
    const { repo } = setup({ username: "user#001" });
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(OPPONENT, "0"), makePlayer(THIRD_PLAYER, "9")] }),
      makeReplay({ players: [makePlayer(OPPONENT, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    // Stored lowercase; matching is case-insensitive via uppercasing.
    expect(await repo.determineUserBasedOnLiveGame([USER, OPPONENT])).toBe(USER);
  });

  it("falls back to the more frequently seen player when the configured user is absent", async () => {
    const { repo } = setup({ username: "SOMEONE#999" });
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    expect(await repo.determineUserBasedOnLiveGame([OPPONENT, USER])).toBe(USER);
  });
});

describe("attemptGetUser", () => {
  it("prefers the configured username, uppercased", async () => {
    const { repo } = setup({ username: "user#001" });

    expect(await repo.attemptGetUser()).toBe(USER);
  });

  it("falls back to the most common player when no username is configured", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    expect(await repo.attemptGetUser()).toBe(USER);
  });
});

describe("the latest-replay pointer", () => {
  it("is stored in the replays store under a reserved key", async () => {
    const { repo, replaysStore } = setup();
    await repo.insertReplay(makeReplay({ name: "Game_A.slp" }));

    expect(await replaysStore.getItem(LATEST_REPLAY_KEY)).toBe("Game_A.slp");
  });
});
