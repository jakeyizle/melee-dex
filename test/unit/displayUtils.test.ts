import { describe, it, expect, afterEach, vi } from "vitest";
import { getTimeString, getPercentageString } from "@/utils/displayUtils";

/**
 * `getTimeString` appears on every card that mentions a date, and its output
 * changes shape four times as the gap grows. The clock is frozen so each
 * boundary is asserted rather than approximated.
 */
const at = (iso: string, run: () => void) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
  try {
    run();
  } finally {
    vi.useRealTimers();
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe("getTimeString", () => {
  const NOW = "2025-06-15T12:00:00Z";

  it("counts in seconds for the last minute", () => {
    at(NOW, () => {
      expect(getTimeString("2025-06-15T11:59:31Z")).toBe("29 seconds ago");
      expect(getTimeString("2025-06-15T11:59:59Z")).toBe("1 seconds ago");
    });
  });

  it("counts in minutes for the last hour", () => {
    at(NOW, () => {
      expect(getTimeString("2025-06-15T11:59:00Z")).toBe("1 minutes ago");
      expect(getTimeString("2025-06-15T11:01:00Z")).toBe("59 minutes ago");
    });
  });

  it("counts in hours for the last day", () => {
    at(NOW, () => {
      expect(getTimeString("2025-06-15T11:00:00Z")).toBe("1 hours ago");
      expect(getTimeString("2025-06-14T13:00:00Z")).toBe("23 hours ago");
    });
  });

  // The date branch renders in the viewer's **local** time, not UTC, so the
  // expectation is derived the same way rather than hardcoded — a UTC literal
  // passes or fails depending on where the suite runs.
  const localDate = (iso: string) => {
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
  };

  it("falls back to a date once it is more than a day ago", () => {
    at(NOW, () => {
      expect(getTimeString("2025-06-14T11:00:00Z")).toBe(
        localDate("2025-06-14T11:00:00Z"),
      );
      expect(getTimeString("2020-07-28T03:00:08Z")).toBe(
        localDate("2020-07-28T03:00:08Z"),
      );
    });
  });

  it("formats that date as MM/DD/YYYY", () => {
    at(NOW, () => {
      expect(getTimeString("2020-07-28T03:00:08Z")).toMatch(
        /^\d{2}\/\d{2}\/\d{4}$/,
      );
    });
  });

  // Each boundary is exclusive at the bottom of the next unit, which is where
  // an off-by-one would show up as "60 seconds ago" or "60 minutes ago".
  it("switches unit exactly on the boundary", () => {
    at(NOW, () => {
      expect(getTimeString("2025-06-15T11:59:00Z")).toBe("1 minutes ago");
      expect(getTimeString("2025-06-15T11:00:00Z")).toBe("1 hours ago");
      expect(getTimeString("2025-06-14T12:00:00Z")).toMatch(
        /^\d{2}\/\d{2}\/\d{4}$/,
      );
    });
  });

  // `firstMatchDate` on a brand-new opponent is the game happening right now,
  // so a zero gap is a real case, not a degenerate one.
  it("handles a date that is right now", () => {
    at(NOW, () => {
      expect(getTimeString(NOW)).toBe("0 seconds ago");
    });
  });
});

describe("getPercentageString", () => {
  it("rounds to two decimal places and adds the sign", () => {
    expect(getPercentageString(66.666666)).toBe("66.67%");
    expect(getPercentageString(50)).toBe("50%");
    expect(getPercentageString(0)).toBe("0%");
    expect(getPercentageString(100)).toBe("100%");
  });
});
