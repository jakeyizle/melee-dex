import { Alert, Container, Grid, Stack } from "@mui/material";
import { DashboardHeader } from "../../Headers/DashboardHeader";
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

  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      {!replayDirectory && (
        <Alert severity="error">
          Replay directory must be set in settings.
        </Alert>
      )}
      <Stack spacing={1.5}>
        {!!currentReplayInfo?.players ? (
          <Grid container>
            <Grid size={{ sm: 0, lg: 1 }}></Grid>
            <Grid size={{ sm: 12, lg: 4 }}>
              <CurrentMatchCard />
              <UserStatsCard />
            </Grid>
            <Grid size={{ sm: 0, lg: 1 }}></Grid>
            <Grid size={{ sm: 12, lg: 4 }}>
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
