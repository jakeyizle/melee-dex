import { LiveMatchDisplay } from "./LiveMatchDisplay";
import { useReplayStore } from "@/replayStore";
import { NoReplayDirectoryCard } from "./NoReplayDirectoryCard";
import { ReplayLoadInProgressCard } from "./ReplayLoadInProgressCard";
import { ListeningForReplayCard } from "./ListeningForReplayCard";
import { LoadingDashboardCard } from "./LoadingDashboardCard";
import { useReplayDirectory } from "@/hooks/useReplayDirectory";

export const DashboardPage = () => {
  const { isLoadingReplays, currentReplayInfo } = useReplayStore();
  const { replayDirectory, hasLoadedReplayDirectory } = useReplayDirectory();

  if (!hasLoadedReplayDirectory) return <LoadingDashboardCard />;
  if (!replayDirectory) return <NoReplayDirectoryCard />;
  if (isLoadingReplays) return <ReplayLoadInProgressCard />;
  if (!currentReplayInfo) return <ListeningForReplayCard />;
  return <LiveMatchDisplay />;
};
