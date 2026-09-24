import log from "electron-log";
import { getRankTier } from "../../src/utils/rankUtils";
import type { RankProfile } from "../../src/types";

/**
 * Current ranked standing for a connect code, from slippi.gg.
 *
 * **This is the only outward-facing call the app makes besides the updater, and
 * it is against an undocumented internal endpoint.** `internal.` in the
 * hostname is Slippi telling you it is not a contract. Every constant below
 * exists to keep the traffic negligible and to make the app stop asking the
 * moment it is unwelcome — do not relax them without a reason:
 *
 * - one request per connect code per TTL, and never a poll;
 * - no bulk lookups, ever. Rank is not stored per replay and cannot be
 *   backfilled over a library, so there is nothing that would justify a fan-out;
 * - a 429 or 403 stops the app asking for the rest of the session, as does a
 *   short run of failures. There is no retry and no backoff timer: for a badge
 *   this optional, stopping is strictly better than trying again.
 *
 * It lives in main rather than the renderer because the packaged renderer loads
 * over `file://`, where a cross-origin fetch is blocked by CORS.
 *
 * Nothing here throws. Every failure is a `null`, which the card renders as no
 * badge at all.
 */

const ENDPOINT = "https://internal.slippi.gg/graphql";

/** Rating only moves when a set ends, so even this over-fetches. */
export const RANK_TTL_MS = 30 * 60 * 1000;

/** A code with no ranked profile does not grow one mid-session. */
export const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;

export const REQUEST_TIMEOUT_MS = 5000;

/** Consecutive failures before the app stops asking for the session. */
export const MAX_CONSECUTIVE_FAILURES = 3;

/** Bounded like `ingestedLiveFiles`: a `Map` iterates in insertion order. */
export const MAX_CACHED_RANKS = 200;

const QUERY = `query UserProfilePageQuery($cc: String) {
  getUser(connectCode: $cc) {
    connectCode { code }
    rankedNetplayProfile {
      ratingOrdinal
      ratingUpdateCount
      wins
      losses
      dailyGlobalPlacement
    }
  }
}`;

let USER_AGENT = "melee-dex";

/**
 * Identifies this app to Slippi. Set once at startup, because the version comes
 * from `app`, which `rankService` must not import: the unit suite runs this file
 * in plain Node with no Electron around it.
 */
export const setRankServiceUserAgent = (userAgent: string) => {
  USER_AGENT = userAgent;
};

type CacheEntry = { profile: RankProfile | null; fetchedAt: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RankProfile | null>>();
let consecutiveFailures = 0;
let isDisabledForSession = false;

/** Test seam. Production never calls this. */
export const resetRankServiceForTests = () => {
  cache.clear();
  inFlight.clear();
  consecutiveFailures = 0;
  isDisabledForSession = false;
};

const isFresh = (entry: CacheEntry, now: number) => {
  const ttl = entry.profile ? RANK_TTL_MS : NEGATIVE_TTL_MS;
  return now - entry.fetchedAt < ttl;
};

const remember = (connectCode: string, profile: RankProfile | null) => {
  cache.set(connectCode, { profile, fetchedAt: Date.now() });
  while (cache.size > MAX_CACHED_RANKS) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
};

const disableForSession = (reason: string) => {
  isDisabledForSession = true;
  log.warn(`Rank lookups disabled for this session: ${reason}`);
};

const requestProfile = async (
  connectCode: string,
): Promise<RankProfile | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { cc: connectCode },
      }),
    });

    // Being rate-limited or refused is the endpoint telling us to go away, and
    // it is the one answer worth obeying immediately rather than after a run of
    // failures.
    if (response.status === 429 || response.status === 403) {
      disableForSession(`HTTP ${response.status}`);
      return null;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = (await response.json()) as {
      data?: { getUser?: RawUser | null } | null;
      errors?: { message?: string; extensions?: { code?: string } }[] | null;
    };

    // A GraphQL error is HTTP 200 with `data.getUser: null` — the same shape as
    // a player who simply has no ranked profile. Treating the two alike is how
    // this quietly becomes a misbehaving client: a refusal would read as "this
    // player is unranked", get cached for the negative TTL, leave the breaker
    // untouched, and the app would keep asking. Observed shape, from probing
    // the sibling `getUsers` field: `{"errors":[{"extensions":{"code":
    // "UNAUTHORIZED"}}],"data":{"getUser":null}}`.
    if (body.errors?.length) {
      const codes = body.errors.map((error) => error.extensions?.code);
      // The GraphQL-layer equivalent of a 403, and obeyed just as immediately.
      if (
        codes.some((code) => code === "UNAUTHORIZED" || code === "FORBIDDEN")
      ) {
        disableForSession(`GraphQL ${codes.join(", ")}`);
        return null;
      }
      // Anything else is a failure, not an answer: it feeds the breaker, and
      // throwing is what keeps it out of the cache.
      throw new Error(`GraphQL error: ${body.errors[0]?.message ?? "unknown"}`);
    }

    // A reachable endpoint answered, so the session is healthy even if this
    // particular code has no profile.
    consecutiveFailures = 0;
    return toRankProfile(connectCode, body.data?.getUser ?? null);
  } finally {
    clearTimeout(timeout);
  }
};

type RawUser = {
  connectCode?: { code?: string | null } | null;
  rankedNetplayProfile?: {
    ratingOrdinal?: number | null;
    ratingUpdateCount?: number | null;
    wins?: number | null;
    losses?: number | null;
    dailyGlobalPlacement?: number | null;
  } | null;
};

/**
 * An unknown connect code comes back as `data.getUser: null` under HTTP 200,
 * not as an error — so "no such player" and "no ranked profile" both land here
 * as `null`, and both are cached negatively.
 */
const toRankProfile = (
  connectCode: string,
  user: RawUser | null,
): RankProfile | null => {
  const profile = user?.rankedNetplayProfile;
  if (!profile || typeof profile.ratingOrdinal !== "number") return null;

  const ratingOrdinal = profile.ratingOrdinal;
  const ratingUpdateCount = profile.ratingUpdateCount ?? 0;
  const dailyGlobalPlacement = profile.dailyGlobalPlacement ?? null;

  return {
    connectCode: user?.connectCode?.code ?? connectCode,
    ratingOrdinal,
    ratingUpdateCount,
    wins: profile.wins ?? 0,
    losses: profile.losses ?? 0,
    dailyGlobalPlacement,
    tier: getRankTier(ratingOrdinal, dailyGlobalPlacement, ratingUpdateCount),
  };
};

/**
 * Set by the Playwright specs. They launch the real app and drive a real live
 * game, which would otherwise put this feature's traffic on slippi.gg on every
 * CI run — for an assertion about the head-to-head card that has nothing to do
 * with rank. Off by default; the app itself never sets it.
 */
const isDisabledByEnv = () =>
  process.env.MELEE_DEX_DISABLE_RANK_LOOKUPS === "1";

export const getRankProfile = async (
  connectCode: string,
): Promise<RankProfile | null> => {
  if (isDisabledByEnv() || isDisabledForSession || !connectCode) return null;

  const cached = cache.get(connectCode);
  if (cached && isFresh(cached, Date.now())) return cached.profile;

  // A game hands us two codes at once and a set re-enters this function for
  // each game; without this, the same code in flight twice would be two
  // requests for one answer.
  const existing = inFlight.get(connectCode);
  if (existing) return existing;

  const request = requestProfile(connectCode)
    .then((profile) => {
      // A disabled session did not learn anything about this code — caching the
      // null would outlive the breaker and hide the answer after a restart.
      if (!isDisabledForSession) remember(connectCode, profile);
      return profile;
    })
    .catch((error) => {
      consecutiveFailures += 1;
      log.warn(`Rank lookup failed for ${connectCode}`, error);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        disableForSession(`${consecutiveFailures} consecutive failures`);
      }
      return null;
    })
    .finally(() => {
      inFlight.delete(connectCode);
    });

  inFlight.set(connectCode, request);
  return request;
};
