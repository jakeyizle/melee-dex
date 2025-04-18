import { Alert, Container, Grid, Stack } from "@mui/material";
import { DashboardHeader } from "./DashboardHeader";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { PlayerStatsCard } from "./PlayerStatsCard";
import { RecentMatchesCard } from "./RecentMatchesCard";
import { useEffect } from "react";

import { ReplayInfoDisplay } from "./ReplayInfoDisplay";
import { useReplayStore } from "@/replayStore";
interface LiveMatchDisplayProps {
  replayDirectory: string;
}

export const LiveMatchDisplay = ({
  replayDirectory,
}: LiveMatchDisplayProps) => {
  const {
    loadReplayDirectory,
    historicalReplays,
    currentReplayInfo,
    isLoadingReplays,
    currentReplaysLoaded,
    totalReplaysToLoad,
    replaysPerSecond,
    totalReplayCount,
  } = useReplayStore();

  useEffect(() => {
    loadReplayDirectory(replayDirectory);
  }, [replayDirectory]);

  return (
    <Container component="main" sx={{ py: 3, flex: 1 }}>
      {!replayDirectory && (
        <Alert severity="error">
          Replay directory must be set in settings.
        </Alert>
      )}
      <ReplayInfoDisplay
        currentLoadCount={currentReplaysLoaded}
        totalLoadCount={totalReplaysToLoad}
        isLoadInProgress={isLoadingReplays}
        totalReplayCount={totalReplayCount}
        replaysPerSecond={replaysPerSecond}
      />
      <Stack spacing={3}>
        <DashboardHeader />
        {!!currentReplayInfo?.players ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CurrentMatchCard
                players={currentReplayInfo.players}
                stageId={currentReplayInfo.stageId}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <PlayerStatsCard
                players={currentReplayInfo.players}
                historicalReplays={historicalReplays}
              />
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
        {historicalReplays.length > 0 && <RecentMatchesCard />}
      </Stack>
    </Container>
  );
};
