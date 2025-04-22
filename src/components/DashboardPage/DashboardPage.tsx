import { useEffect, useState } from "react";
import { selectAllSettings } from "@/db/settings";
import { LiveMatchDisplay } from "./LiveMatchDisplay";
import { useReplayStore } from "@/replayStore";
import { NoReplayDirectoryCard } from "./NoReplayDirectoryCard";
import { ReplayLoadInProgressCard } from "./ReplayLoadInProgressCard";
import { ListeningForReplayCard } from "./ListeningForReplayCard";
import { CircularProgress } from "@mui/material";
import { LoadingDashboardCard } from "./LoadingDashboardCard";

export const DashboardPage = () => {
  const { isLoadingReplays, currentReplayInfo, loadReplayDirectory } =
    useReplayStore();
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

  if (!hasLoadedReplayDirectory) return <LoadingDashboardCard />;
  if (!replayDirectory) return <NoReplayDirectoryCard />;
  if (isLoadingReplays) return <ReplayLoadInProgressCard />;
  if (!currentReplayInfo) return <ListeningForReplayCard />;
  return <LiveMatchDisplay />;
};
