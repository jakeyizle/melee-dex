import { describe, it, expect } from "vitest";
import { best } from "@/utils/arrayUtils";

const byValue = (a: { value: number }, b: { value: number }) =>
  b.value - a.value;

describe("best", () => {
  it("returns the row a sort would put first", () => {
    const rows = [{ value: 2 }, { value: 9 }, { value: 5 }];

    expect(best(rows, byValue)).toEqual({ value: 9 });
  });

  it("returns undefined for an empty list", () => {
    expect(best([], byValue)).toBeUndefined();
  });

  it("does not touch the list it was given", () => {
    const rows = [{ value: 2 }, { value: 9 }];
    const order = [...rows];

    best(rows, byValue);

    expect(rows).toEqual(order);
    expect(rows[0]).toBe(order[0]);
  });

  // It replaced `[...rows].sort(compare)[0]`, and Array.prototype.sort is
  // stable, so a tie has to resolve the same way it did before.
  it("keeps the earlier row when two compare equal", () => {
    const first = { value: 9, id: "first" };
    const second = { value: 9, id: "second" };

    expect(best([first, second], byValue)).toBe(first);
    expect(best([first, second], byValue)).toBe(
      [first, second].sort(byValue)[0],
    );
  });

  it("agrees with sorting a copy across a shuffled list", () => {
    const rows = [5, 1, 9, 3, 9, 2].map((value) => ({ value }));

    expect(best(rows, byValue)).toBe([...rows].sort(byValue)[0]);
  });
});
