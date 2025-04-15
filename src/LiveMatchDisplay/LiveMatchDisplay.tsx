import { Alert, Box, Container, Grid, Stack } from "@mui/material";
import { DashboardHeader } from "./DashboardHeader";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { PlayerStatsCard } from "./PlayerStatsCard";
import { RecentMatchesCard } from "./RecentMatchesCard";
import { useEffect, useRef, useState } from "react";
import { selectAllSettings } from "@/db/settings";
import {
  selectAllReplayNames,
  Replay,
  selectReplaysWithBothPlayers,
} from "@/db/replays";
import { ReplayInfoDisplay } from "./ReplayInfoDisplay";
import { CurrentReplayInfo, LiveReplayPlayers } from "@/types";

export const LiveMatchDisplay = () => {
  const [replayDirectory, setReplayDirectory] = useState("");
  const [currentReplaysLoaded, setCurrentReplaysLoaded] = useState(0);
  const [totalReplaysToLoad, setTotalReplaysToLoad] = useState(0);
  const [isLoadingReplays, setIsLoadingReplays] = useState(false);
  const [historicalReplays, setHistoricalReplays] = useState<Replay[]>([]);
  const [currentReplayInfo, setCurrentReplayInfo] =
    useState<CurrentReplayInfo | null>(null);
  const currentFileName = useRef<string | null>(null);

  // start replay load only when we have a directory
  useEffect(() => {
    const fetchSettings = async () => {
      const { replayDirectory } = await selectAllSettings();
      setReplayDirectory(replayDirectory);
      if (!!replayDirectory) {
        const existingReplayNames = await selectAllReplayNames();
        window.ipcRenderer.invoke("begin-loading-replays", {
          replayDirectory: replayDirectory,
          existingReplayNames,
        });
        setIsLoadingReplays(true);

        window.ipcRenderer.invoke("listen-for-new-replays", {
          replayDirectory,
        });
      }
    };
    fetchSettings();

    return () => {
      window.ipcRenderer.invoke("stop-listening-for-new-replays");
    };
  }, []);

  // update replay load progress
  useEffect(() => {
    const updateReplayLoadProgress = (
      _event: any,
      args: { currentReplaysLoaded: number; totalReplaysToLoad: number },
    ) => {
      const { currentReplaysLoaded, totalReplaysToLoad } = args;
      setCurrentReplaysLoaded(currentReplaysLoaded);
      setTotalReplaysToLoad(totalReplaysToLoad);
    };

    const endLoadingReplays = (_event: any, args: { totalReplays: number }) => {
      const { totalReplays } = args;
      setTotalReplaysToLoad(totalReplays);
      setCurrentReplaysLoaded(0);
      setIsLoadingReplays(false);
    };

    window.ipcRenderer.on(
      "update-replay-load-progress",
      updateReplayLoadProgress,
    );
    window.ipcRenderer.on("end-loading-replays", endLoadingReplays);
    return () => {
      window.ipcRenderer.off(
        "update-replay-load-progress",
        updateReplayLoadProgress,
      );
      window.ipcRenderer.off("end-loading-replays", endLoadingReplays);
    };
  }, []);

  // listen for new replays
  useEffect(() => {
    const newReplayLoaded = async (
      _event: any,
      args: { filename: string; players: LiveReplayPlayers[]; stageId: string },
    ) => {
      const { filename, players, stageId } = args;
      if (filename === currentFileName?.current) return;
      // start new replay load
      const existingReplayNames = await selectAllReplayNames();
      window.ipcRenderer.invoke("begin-loading-replays", {
        replayDirectory: replayDirectory,
        existingReplayNames,
      });
      setIsLoadingReplays(true);

      const historicalReplays = await selectReplaysWithBothPlayers([
        players[0].connectCode,
        players[1].connectCode,
      ]);
      setHistoricalReplays(historicalReplays);
      setCurrentReplayInfo({ players, stageId });
      currentFileName.current = filename;
    };
    window.ipcRenderer.on("new-game", newReplayLoaded);

    return () => {
      window.ipcRenderer.off("new-game", newReplayLoaded);
    };
  }, [replayDirectory]);

  return (
    <Container component="main" sx={{ py: 3, flex: 1 }}>
      {!replayDirectory && (
        <Alert severity="error">
          Replay directory must be set in settings.
        </Alert>
      )}
      <ReplayInfoDisplay
        currentCount={currentReplaysLoaded}
        totalCount={totalReplaysToLoad}
        isLoadInProgress={isLoadingReplays}
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
        ) : (
          <Alert severity="info">No current replay</Alert>
        )}
        {historicalReplays.length > 0 && <RecentMatchesCard />}
      </Stack>
    </Container>
  );
};
