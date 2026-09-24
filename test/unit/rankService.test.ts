import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electron-log", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
  getRankProfile,
  resetRankServiceForTests,
  MAX_CACHED_RANKS,
  MAX_CONSECUTIVE_FAILURES,
  RANK_TTL_MS,
  NEGATIVE_TTL_MS,
  REQUEST_TIMEOUT_MS,
} from "../../electron/main/rankService";

/** The shape the endpoint really returns, trimmed to the fields queried. */
const userPayload = (overrides: Record<string, unknown> = {}) => ({
  data: {
    getUser: {
      connectCode: { code: "KENJ#707" },
      rankedNetplayProfile: {
        ratingOrdinal: 1474.6523528188982,
        ratingUpdateCount: 8,
        wins: 6,
        losses: 2,
        dailyGlobalPlacement: null,
        ...overrides,
      },
    },
  },
});

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetRankServiceForTests();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getRankProfile", () => {
  it("maps a profile and derives its tier", async () => {
    fetchMock.mockResolvedValue(jsonResponse(userPayload()));

    const profile = await getRankProfile("KENJ#707");

    expect(profile).toEqual({
      connectCode: "KENJ#707",
      ratingOrdinal: 1474.6523528188982,
      ratingUpdateCount: 8,
      wins: 6,
      losses: 2,
      dailyGlobalPlacement: null,
      tier: "Gold 1",
    });
  });

  it("posts the connect code to the endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(userPayload()));

    await getRankProfile("KENJ#707");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://internal.slippi.gg/graphql");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).variables).toEqual({ cc: "KENJ#707" });
    // Identifies the app so Slippi can see, or block, this traffic deliberately.
    expect(init.headers["User-Agent"]).toContain("melee-dex");
  });

  describe("caching", () => {
    it("asks once for repeated lookups of the same code", async () => {
      fetchMock.mockResolvedValue(jsonResponse(userPayload()));

      await getRankProfile("KENJ#707");
      await getRankProfile("KENJ#707");
      await getRankProfile("KENJ#707");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("coalesces two lookups racing on the same code", async () => {
      // The live path asks for both players at once, and a set asks again per
      // game. Without the in-flight map this is two requests for one answer.
      fetchMock.mockResolvedValue(jsonResponse(userPayload()));

      await Promise.all([getRankProfile("KENJ#707"), getRankProfile("KENJ#707")]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("asks again once the TTL has passed", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue(jsonResponse(userPayload()));

      await getRankProfile("KENJ#707");
      vi.setSystemTime(Date.now() + RANK_TTL_MS + 1);
      await getRankProfile("KENJ#707");

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("caches an unknown code negatively, on its own longer TTL", async () => {
      vi.useFakeTimers();
      // An unknown code is HTTP 200 with a null user, not an error.
      fetchMock.mockResolvedValue(jsonResponse({ data: { getUser: null } }));

      expect(await getRankProfile("ZZZZ#999")).toBeNull();

      vi.setSystemTime(Date.now() + RANK_TTL_MS + 1);
      expect(await getRankProfile("ZZZZ#999")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + NEGATIVE_TTL_MS + 1);
      await getRankProfile("ZZZZ#999");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("treats a user with no ranked profile as a miss", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: { getUser: { connectCode: { code: "A#1" }, rankedNetplayProfile: null } },
        }),
      );

      expect(await getRankProfile("A#1")).toBeNull();
    });

    it("evicts the oldest entry past the cap", async () => {
      fetchMock.mockResolvedValue(jsonResponse(userPayload()));

      for (let i = 0; i <= MAX_CACHED_RANKS; i++) {
        await getRankProfile(`AAA#${i}`);
      }
      const callsBefore = fetchMock.mock.calls.length;

      // The first code is the one that should have been dropped.
      await getRankProfile("AAA#0");
      expect(fetchMock.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  describe("giving up", () => {
    it("returns null and does not throw when the request fails", async () => {
      fetchMock.mockRejectedValue(new Error("ENOTFOUND"));

      await expect(getRankProfile("KENJ#707")).resolves.toBeNull();
    });

    it("stops asking for the session after a 429", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 429));

      await getRankProfile("KENJ#707");
      await getRankProfile("OTHR#111");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("stops asking for the session after a 403", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 403));

      await getRankProfile("KENJ#707");
      await getRankProfile("OTHR#111");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("stops asking after a run of failures", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNRESET"));

      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        await getRankProfile(`AAA#${i}`);
      }
      expect(fetchMock).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES);

      await getRankProfile("BBB#222");
      expect(fetchMock).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES);
    });

    it("does not give up over failures a success has separated", async () => {
      // Intermittent failures are routine; the breaker is for an endpoint that
      // has genuinely stopped answering, so any success must reset the count.
      fetchMock
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValueOnce(jsonResponse(userPayload()))
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockRejectedValueOnce(new Error("ECONNRESET"))
        .mockResolvedValue(jsonResponse(userPayload()));

      for (let i = 0; i < 5; i++) await getRankProfile(`AAA#${i}`);

      expect(await getRankProfile("BBB#222")).not.toBeNull();
    });

    it("does not cache the null from a disabled session", async () => {
      // The breaker taught us nothing about this code. Caching it would keep the
      // answer hidden past the restart that clears the breaker.
      fetchMock.mockResolvedValue(jsonResponse({}, 429));
      await getRankProfile("KENJ#707");

      resetRankServiceForTests();
      fetchMock.mockResolvedValue(jsonResponse(userPayload()));

      expect(await getRankProfile("KENJ#707")).not.toBeNull();
    });

    // A GraphQL error is HTTP 200 with a null user — the same shape as a player
    // who has no ranked profile. These pin the two apart.
    describe("errors the endpoint reports at HTTP 200", () => {
      const graphqlError = (code?: string) =>
        jsonResponse({
          errors: [{ message: "boom", ...(code ? { extensions: { code } } : {}) }],
          data: { getUser: null },
        });

      it("does not cache a reported error as a missing profile", async () => {
        fetchMock.mockResolvedValue(graphqlError());

        expect(await getRankProfile("KENJ#707")).toBeNull();
        expect(await getRankProfile("KENJ#707")).toBeNull();

        // Cached, this would hide a real profile for the whole negative TTL.
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it("counts a reported error towards giving up", async () => {
        fetchMock.mockResolvedValue(graphqlError());

        for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
          await getRankProfile(`AAA#${i}`);
        }
        await getRankProfile("BBB#222");

        expect(fetchMock).toHaveBeenCalledTimes(MAX_CONSECUTIVE_FAILURES);
      });

      it("stops asking at once when the error is a refusal", async () => {
        // The GraphQL-layer equivalent of a 403, and the shape the sibling
        // `getUsers` field really returns.
        fetchMock.mockResolvedValue(graphqlError("UNAUTHORIZED"));

        await getRankProfile("KENJ#707");
        await getRankProfile("OTHR#111");

        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it("stops asking at once on FORBIDDEN too", async () => {
        fetchMock.mockResolvedValue(graphqlError("FORBIDDEN"));

        await getRankProfile("KENJ#707");
        await getRankProfile("OTHR#111");

        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it("still reads a profile that arrives with no errors array", async () => {
        fetchMock.mockResolvedValue(jsonResponse(userPayload()));

        expect(await getRankProfile("KENJ#707")).not.toBeNull();
      });
    });

    it("gives up on a response that is not JSON at all", async () => {
      // A proxy or an error page, rather than the endpoint.
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      });

      expect(await getRankProfile("KENJ#707")).toBeNull();
      // A failure, not a miss: asking again must not be blocked by a cache.
      expect(await getRankProfile("KENJ#707")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("abandons a request that outlasts the timeout", async () => {
      vi.useFakeTimers();
      // Rejects when, and only when, the service aborts it.
      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () =>
              reject(new Error("AbortError")),
            );
          }),
      );

      const pending = getRankProfile("KENJ#707");
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);

      expect(await pending).toBeNull();
    });

    it("asks for nothing when the connect code is empty", async () => {
      expect(await getRankProfile("")).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    // The Playwright specs launch the real app, so without this they would put
    // this feature's traffic on slippi.gg on every CI run.
    it("asks for nothing when disabled by the environment", async () => {
      process.env.MELEE_DEX_DISABLE_RANK_LOOKUPS = "1";
      try {
        expect(await getRankProfile("KENJ#707")).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        delete process.env.MELEE_DEX_DISABLE_RANK_LOOKUPS;
      }
    });
  });
});
