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
  for (const replay of replays) await repo.insertReplays([replay]);
};

describe("storing and retrieving replays", () => {
  it("stores every replay in a batch under its filename", async () => {
    const { repo } = setup();
    const first = makeReplay({ name: "Game_A.slp" });
    const second = makeReplay({ name: "Game_B.slp" });
    const third = makeReplay({ name: "Game_C.slp" });

    await repo.insertReplays([first, second, third]);

    expect(await repo.selectReplay("Game_A.slp")).toEqual(first);
    expect(await repo.selectReplay("Game_B.slp")).toEqual(second);
    expect(await repo.selectReplay("Game_C.slp")).toEqual(third);
  });

  it("writes nothing at all for an empty batch", async () => {
    const { repo, replaysStore } = setup();

    await repo.insertReplays([]);

    expect(await replaysStore.length()).toBe(0);
  });

  it("reads back a replay by name", async () =>{
    const { repo } = setup();
    const replay = makeReplay({ name: "Game_A.slp" });
    await repo.insertReplays([replay]);

    expect(await repo.selectReplay("Game_A.slp")).toEqual(replay);
  });

  it("has no replay under a name that was never stored", async () => {
    const { repo } = setup();

    expect(await repo.selectReplay("Game_Missing.slp")).toBeNull();
  });

  it("lists the names of both good and rejected replays", async () => {
    const { repo } = setup();
    await repo.insertReplays([makeReplay({ name: "Good.slp" })]);
    await repo.insertBadReplays([{ name: "Bad.slp", path: "C:/r/Bad.slp" }]);

    const names = await repo.selectAllReplayNames();

    expect(names).toContain("Good.slp");
    expect(names).toContain("Bad.slp");
  });

  it("counts rejected replays separately", async () => {
    const { repo } = setup();
    await repo.insertBadReplays([
      { name: "Bad1.slp", path: "C:/r/Bad1.slp" },
      { name: "Bad2.slp", path: "C:/r/Bad2.slp" },
    ]);

    expect(await repo.selectBadReplayCount()).toBe(2);
  });

  it("counts exactly the replays that were stored", async () => {
    const { repo } = setup();
    await seedReplays(repo, [makeReplay(), makeReplay()]);

    expect(await repo.selectReplayCount()).toBe(2);
  });

  // The store holds replays and nothing else, so consumers do not have to
  // defend against non-replay values.
  it("yields only replays to callers iterating the store", async () => {
    const { repo } = setup();
    const replay = makeReplay({ name: "Game_A.slp" });
    await seedReplays(repo, [replay]);

    const seen: unknown[] = [];
    // The callback must not return a value: localforage (and the in-memory fake)
    // treat a non-undefined return as an early exit from the iteration.
    await repo.executeCallbackOnEachReplay((r) => {
      seen.push(r);
    });

    expect(seen).toEqual([replay]);
  });
});

describe("working out who the user is", () => {
  it("picks whichever candidate appears in more stored replays", async () => {
    const { repo } = setup();
    // USER in 3, OPPONENT in 1. The counts have to actually differ for this to
    // be testing what it says — with one replay each they tie, and the answer
    // comes from the tie-break below instead.
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    expect(await repo.getMostCommonUser([OPPONENT, USER])).toBe(USER);
    expect(await repo.getMostCommonUser([USER, OPPONENT])).toBe(USER);
  });

  it("falls back to the most frequent player overall when neither candidate is known", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(THIRD_PLAYER, "9")] }),
    ]);

    expect(await repo.getMostCommonUser(["NONE#000", "ALSO#000"])).toBe(USER);
  });

  // Candidates arrive in the live game's port order, so a tie must not be
  // broken by position — it would make the answer depend on the port used.
  it("returns the first candidate when both appear equally often", async () => {
    const { repo } = setup();
    await seedReplays(repo, [
      makeReplay({ players: [makePlayer(USER, "0"), makePlayer(OPPONENT, "9")] }),
    ]);

    expect(await repo.getMostCommonUser([USER, OPPONENT])).toBe(USER);
    // Same two players, opposite port order.
    expect(await repo.getMostCommonUser([OPPONENT, USER])).toBe(OPPONENT);
  });

  it("returns no user at all when there are no replays", async () => {
    const { repo } = setup();

    expect(await repo.getMostCommonUser([])).toBe("");
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

describe("the legacy latest-replay pointer", () => {
  it("is no longer written when replays are stored", async () => {
    const { repo, replaysStore } = setup();

    await repo.insertReplays([makeReplay({ name: "Game_A.slp" })]);

    expect(await replaysStore.getItem(LATEST_REPLAY_KEY)).toBeNull();
  });

  it("is cleared out of a store that still has one", async () => {
    const { repo, replaysStore } = setup();
    await replaysStore.setItem(LATEST_REPLAY_KEY, "Game_A.slp");

    await repo.deleteLegacyLatestReplayPointer();

    expect(await replaysStore.getItem(LATEST_REPLAY_KEY)).toBeNull();
    expect(await repo.selectReplayCount()).toBe(0);
  });
});
