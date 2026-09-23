import { Container, Grid, Stack, Typography } from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { useReplayDirectory } from "@/hooks/useReplayDirectory";
import { OverallStatsCard } from "@/components/OverallStatsCard";
import { NoReplayDirectoryCard } from "@/components/DashboardPage/NoReplayDirectoryCard";
import { ReplayLoadInProgressCard } from "@/components/DashboardPage/ReplayLoadInProgressCard";
import { LoadingDashboardCard } from "@/components/DashboardPage/LoadingDashboardCard";
import { NoIdentityCard } from "@/components/NoIdentityCard";
import { NoGamesCard } from "./NoGamesCard";
import { StageStatsTable } from "./StageStatsTable";
import { ModeBreakdown } from "./ModeBreakdown";

/**
 * Everything about the library as a whole, readable at any time. Unlike the
 * dashboard this never waits on a live game — `newStatInfo` is built from
 * IndexedDB when the import ends, independently of whether anyone is playing.
 */
export const LibraryPage = () => {
  const { isLoadingReplays, newStatInfo } = useReplayStore();
  const { replayDirectory, hasLoadedReplayDirectory } = useReplayDirectory();

  if (!hasLoadedReplayDirectory) return <LoadingDashboardCard />;
  if (!replayDirectory) return <NoReplayDirectoryCard />;
  if (isLoadingReplays) return <ReplayLoadInProgressCard />;
  // Null means no connect code was configured or guessed, so no stats were
  // built at all — a different problem from having stats that are empty.
  if (!newStatInfo) return <NoIdentityCard />;
  if (newStatInfo.stats.overallStat.totalCount === 0) return <NoGamesCard />;

  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={{ sm: 12, lg: 7 }}>
          <Stack spacing={4}>
            <OverallStatsCard />
            <ModeBreakdown stats={newStatInfo.stats} />
          </Stack>
        </Grid>
        <Grid size={{ sm: 12, lg: 5 }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              By Stage
            </Typography>
            <StageStatsTable stageStats={newStatInfo.stats.stageStats} />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};
