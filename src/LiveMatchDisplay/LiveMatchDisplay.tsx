import { Alert, Container, Grid, Stack } from "@mui/material";
import { DashboardHeader } from "./DashboardHeader";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { RecentMatchesCard } from "./RecentMatchesCard";
import { useEffect } from "react";

import { ReplayInfoDisplay } from "./ReplayInfoDisplay";
import { useReplayStore } from "@/replayStore";
import { UserStatsCard } from "./UserStatsCard";
interface LiveMatchDisplayProps {
  replayDirectory: string;
}

export const LiveMatchDisplay = ({
  replayDirectory,
}: LiveMatchDisplayProps) => {
  const { loadReplayDirectory, currentReplayInfo, isLoadingReplays } =
    useReplayStore();

  useEffect(() => {
    loadReplayDirectory(replayDirectory);
  }, [replayDirectory]);

  return (
    <Container component="main" sx={{ py: 3, flex: 1 }} maxWidth="xl">
      {!replayDirectory && (
        <Alert severity="error">
          Replay directory must be set in settings.
        </Alert>
      )}
      <ReplayInfoDisplay />
      <Stack spacing={1.5}>
        <DashboardHeader />
        {!!currentReplayInfo?.players ? (
          <Grid container spacing={3}>
            <Grid size={{ sm: 12, md: 4 }}>
              <CurrentMatchCard />
            </Grid>
            <Grid size={{ sm: 12, md: 4 }}>
              <UserStatsCard />
            </Grid>
            <Grid size={{ sm: 12, md: 4 }}>
              <HeadToHeadCard />
            </Grid>
          </Grid>
        ) : isLoadingReplays ? (
          <Alert severity="info">
            Listening for replays paused while load in progress
          </Alert>
        ) : (
          !!replayDirectory && (
            <Alert severity="info">Listening for new game...</Alert>
          )
        )}
      </Stack>
    </Container>
  );
};
