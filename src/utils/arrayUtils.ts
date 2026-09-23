/**
 * The row a sort by `compare` would put first, found in one pass.
 *
 * Deliberately not `[...rows].sort(compare)[0]`: callers read one element out
 * of a list with an entry per opponent ever played, and copying and sorting all
 * of it is work proportional to n log n for an answer that costs n. Sorting
 * `rows` in place instead is worse again — the rows live inside the `FullStats`
 * the store holds, so it would reorder state from inside a render.
 *
 * Ties keep the earlier row, as a stable sort would. Returns undefined for an
 * empty list rather than an undefined element.
 */
export const best = <T>(
  rows: T[],
  compare: (a: T, b: T) => number,
): T | undefined =>
  rows.reduce<T | undefined>(
    (winner, row) =>
      winner === undefined || compare(row, winner) < 0 ? row : winner,
    undefined,
  );
