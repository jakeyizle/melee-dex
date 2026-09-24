/**
 * Slippi ranked tiers, derived from a `ratingOrdinal`.
 *
 * Pure and free of any network or Electron import, so it is unit-testable in
 * Node — the fetch that produces the numbers lives in
 * `electron/main/rankService.ts`, which deliberately returns them raw.
 */

/** Ranked sets required before Slippi assigns a tier at all. */
export const PLACEMENT_MATCHES_REQUIRED = 5;

/** The rating every unplayed profile starts a season on. */
export const STARTING_RATING = 1100;

/**
 * The bottom of each tier, ascending. A rating falls in the last band whose
 * floor it reaches, so only the floors are needed and the table cannot develop
 * a gap between two bands the way a floor/ceiling pair can.
 */
const TIER_FLOORS: { floor: number; name: string }[] = [
  { floor: 0, name: "Bronze 1" },
  { floor: 765.43, name: "Bronze 2" },
  { floor: 913.72, name: "Bronze 3" },
  { floor: 1054.87, name: "Silver 1" },
  { floor: 1188.88, name: "Silver 2" },
  { floor: 1315.75, name: "Silver 3" },
  { floor: 1435.48, name: "Gold 1" },
  { floor: 1548.07, name: "Gold 2" },
  { floor: 1653.52, name: "Gold 3" },
  { floor: 1751.83, name: "Platinum 1" },
  { floor: 1843, name: "Platinum 2" },
  { floor: 1927.03, name: "Platinum 3" },
  { floor: 2003.92, name: "Diamond 1" },
  { floor: 2073.67, name: "Diamond 2" },
  { floor: 2136.28, name: "Diamond 3" },
  { floor: 2191.75, name: "Master 1" },
  { floor: 2275, name: "Master 2" },
  { floor: 2350, name: "Master 3" },
];

/** The rating at which a global placement means Grandmaster rather than Master. */
const GRANDMASTER_FLOOR = 2191.75;

export const PENDING_TIER = "Pending";

/**
 * The tier shown for a profile.
 *
 * Two cases the floors alone get wrong:
 *
 * - **Grandmaster** is not a rating band. It is the Master range *plus* a
 *   global placement, so a 2200 player without one is Master 1, not Grandmaster.
 * - **Pending.** A profile that has not played its placement sets still reports
 *   a rating — 1100, the season's starting value — which the table would happily
 *   read as Silver 1. Showing a real tier for someone who has not earned one is
 *   worse than showing nothing, so placement is checked first.
 */
export const getRankTier = (
  ratingOrdinal: number,
  dailyGlobalPlacement: number | null,
  ratingUpdateCount: number,
): string => {
  if (ratingUpdateCount < PLACEMENT_MATCHES_REQUIRED) return PENDING_TIER;

  if (dailyGlobalPlacement !== null && ratingOrdinal >= GRANDMASTER_FLOOR) {
    return "Grandmaster";
  }

  let tier = TIER_FLOORS[0]!.name;
  for (const band of TIER_FLOORS) {
    if (ratingOrdinal >= band.floor) tier = band.name;
    else break;
  }
  return tier;
};

/** `1474.6523528188982` → `"1475"`. The decimals are noise on a live card. */
export const getRatingString = (ratingOrdinal: number) =>
  Math.round(ratingOrdinal).toString();
