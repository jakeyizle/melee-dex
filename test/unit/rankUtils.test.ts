import { describe, it, expect } from "vitest";
import {
  getRankTier,
  getRatingString,
  PENDING_TIER,
  PLACEMENT_MATCHES_REQUIRED,
  STARTING_RATING,
} from "@/utils/rankUtils";

/** Enough sets that placement is never what is under test. */
const PLACED = 20;

describe("getRankTier", () => {
  it("names each tier from a rating inside its band", () => {
    expect(getRankTier(500, null, PLACED)).toBe("Bronze 1");
    expect(getRankTier(1000, null, PLACED)).toBe("Bronze 3");
    expect(getRankTier(1250, null, PLACED)).toBe("Silver 2");
    expect(getRankTier(1600, null, PLACED)).toBe("Gold 2");
    expect(getRankTier(1900, null, PLACED)).toBe("Platinum 2");
    expect(getRankTier(2100, null, PLACED)).toBe("Diamond 2");
    expect(getRankTier(2300, null, PLACED)).toBe("Master 2");
  });

  it("puts a rating exactly on a floor in the higher tier", () => {
    expect(getRankTier(765.42, null, PLACED)).toBe("Bronze 1");
    expect(getRankTier(765.43, null, PLACED)).toBe("Bronze 2");
    expect(getRankTier(1843, null, PLACED)).toBe("Platinum 2");
  });

  it("names every tier exactly once, in ascending order", () => {
    // Walks the floors rather than sweeping every rating: a table that went
    // back to floor/ceiling pairs could leave a rating between two bands
    // unnamed, and a mistyped floor could shadow a tier entirely. Both show up
    // as the sequence of names here changing.
    const floors = [
      0, 765.43, 913.72, 1054.87, 1188.88, 1315.75, 1435.48, 1548.07, 1653.52,
      1751.83, 1843, 1927.03, 2003.92, 2073.67, 2136.28, 2191.75, 2275, 2350,
    ];
    const names = floors.map((floor) => getRankTier(floor, null, PLACED));

    expect(names).toEqual([
      "Bronze 1", "Bronze 2", "Bronze 3",
      "Silver 1", "Silver 2", "Silver 3",
      "Gold 1", "Gold 2", "Gold 3",
      "Platinum 1", "Platinum 2", "Platinum 3",
      "Diamond 1", "Diamond 2", "Diamond 3",
      "Master 1", "Master 2", "Master 3",
    ]);
    // And the rating just under each floor belongs to the tier below it.
    floors.slice(1).forEach((floor, index) => {
      expect(getRankTier(floor - 0.01, null, PLACED)).toBe(names[index]);
    });
  });

  it("reads a rating above the top floor as the top tier", () => {
    expect(getRankTier(99999, null, PLACED)).toBe("Master 3");
  });

  describe("Grandmaster", () => {
    it("needs a global placement as well as the rating", () => {
      expect(getRankTier(2250, 1, PLACED)).toBe("Grandmaster");
      expect(getRankTier(2250, null, PLACED)).toBe("Master 1");
    });

    it("is not given to a placed player below the Master range", () => {
      expect(getRankTier(2050, 1, PLACED)).toBe("Diamond 1");
    });

    it("counts a placement of 0 as a placement", () => {
      // `dailyGlobalPlacement` is checked against null, not for truthiness —
      // rank 0 would be the best possible placement, not the absence of one.
      expect(getRankTier(2250, 0, PLACED)).toBe("Grandmaster");
    });
  });

  describe("pending", () => {
    it("reports an unplayed profile as pending, not as its starting rating", () => {
      // The case that motivates this: a fresh profile reports 1100, which the
      // band table alone would call Silver 1.
      expect(getRankTier(STARTING_RATING, null, 0)).toBe(PENDING_TIER);
    });

    it("stays pending up to the last placement set", () => {
      expect(
        getRankTier(1500, null, PLACEMENT_MATCHES_REQUIRED - 1),
      ).toBe(PENDING_TIER);
      expect(getRankTier(1500, null, PLACEMENT_MATCHES_REQUIRED)).toBe("Gold 1");
    });

    it("outranks a global placement", () => {
      expect(getRankTier(2250, 1, 0)).toBe(PENDING_TIER);
    });
  });
});

describe("getRatingString", () => {
  it("rounds the rating to a whole number", () => {
    expect(getRatingString(1474.6523528188982)).toBe("1475");
    expect(getRatingString(1100)).toBe("1100");
  });
});
