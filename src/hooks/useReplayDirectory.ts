import { useEffect, useState } from "react";
import { selectAllSettings } from "@/db/settings";
import { useReplayStore } from "@/replayStore";

/**
 * Reads the configured replay directory and kicks off the import for it.
 *
 * Both routes that can be the first screen of a session need this, so it does
 * not belong to the dashboard. Running it twice is safe: main declines a second
 * import while one is in flight, and declines again when there is nothing new
 * on disk to read.
 */
export const useReplayDirectory = () => {
  const loadReplayDirectory = useReplayStore(
    (state) => state.loadReplayDirectory,
  );
  const [replayDirectory, setReplayDirectory] = useState("");
  const [hasLoadedReplayDirectory, setHasLoadedReplayDirectory] =
    useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { replayDirectory } = await selectAllSettings();

      setReplayDirectory(replayDirectory);
      // the await does help with loading
      await loadReplayDirectory(replayDirectory);
      setHasLoadedReplayDirectory(true);
    };
    fetchSettings();
  }, []);

  return { replayDirectory, hasLoadedReplayDirectory };
};
