import { KeyValueStore } from "@/db/replayRepository";

/**
 * A localforage-shaped store backed by a Map. Lets the db layer be exercised
 * without IndexedDB, and therefore without a fake-indexeddb dependency.
 */
export const createInMemoryStore = (
  seed: Record<string, unknown> = {},
): KeyValueStore => {
  const data = new Map<string, unknown>(Object.entries(seed));

  return {
    async getItem<T>(key: string): Promise<T | null> {
      return data.has(key) ? (data.get(key) as T) : null;
    },
    async setItem<T>(key: string, value: T): Promise<T> {
      data.set(key, value);
      return value;
    },
    async removeItem(key: string): Promise<void> {
      data.delete(key);
    },
    async keys(): Promise<string[]> {
      return Array.from(data.keys());
    },
    async length(): Promise<number> {
      return data.size;
    },
    async iterate<T, U>(
      iteratee: (value: T, key: string, iterationNumber: number) => U | void,
    ): Promise<U | void> {
      let i = 1;
      for (const [key, value] of data.entries()) {
        const result = iteratee(value as T, key, i++);
        if (result !== undefined) return result;
      }
    },
  };
};
