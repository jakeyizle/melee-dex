import { useEffect, useState } from "react";
import { selectAllSettings } from "./db/settings";
import { LiveMatchDisplay } from "./LiveMatchDisplay";

export const DashboardPage = () => {
  const [replayDirectory, setReplayDirectory] = useState("");
  useEffect(() => {
    const fetchSettings = async () => {
      const { replayDirectory } = await selectAllSettings();
      setReplayDirectory(replayDirectory);
    };
    fetchSettings();
  }, []);

  return <LiveMatchDisplay replayDirectory={replayDirectory} />;
};
