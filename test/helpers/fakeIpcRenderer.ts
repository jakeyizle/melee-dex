type Handler = (event: unknown, args: any) => void;

/**
 * Stands in for the preload bridge (`window.ipcRenderer`). Records the handlers
 * the store registers so a test can fire a channel the way the main process would.
 */
export const createFakeIpcRenderer = () => {
  const handlers = new Map<string, Handler[]>();
  const invocations: { channel: string; args: unknown }[] = [];
  const invokeResults = new Map<string, unknown>();

  return {
    invocations,
    setInvokeResult(channel: string, result: unknown) {
      invokeResults.set(channel, result);
    },
    /** Fire a channel and wait for the (usually async) handler to settle. */
    async emit(channel: string, args?: unknown) {
      const channelHandlers = handlers.get(channel) ?? [];
      for (const handler of channelHandlers) {
        await handler({}, args);
      }
    },
    hasHandlerFor(channel: string) {
      return (handlers.get(channel) ?? []).length > 0;
    },
    // --- the surface src/replayStore.ts actually uses ---
    on(channel: string, handler: Handler) {
      handlers.set(channel, [...(handlers.get(channel) ?? []), handler]);
      return this;
    },
    off() {
      return this;
    },
    send() {},
    async invoke(channel: string, args?: unknown) {
      invocations.push({ channel, args });
      return invokeResults.get(channel);
    },
  };
};

export type FakeIpcRenderer = ReturnType<typeof createFakeIpcRenderer>;

/** Must run before importing src/replayStore.ts, which reads window at setup time. */
export const installFakeIpcRenderer = () => {
  const ipcRenderer = createFakeIpcRenderer();
  (globalThis as any).window = { ...(globalThis as any).window, ipcRenderer };
  return ipcRenderer;
};
