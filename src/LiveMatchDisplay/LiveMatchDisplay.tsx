import {
  Alert,
  Box,
  Container,
  Grid,
  Stack,
} from "@mui/material"
import { DashboardHeader } from "./DashboardHeader"
import { CurrentMatchCard } from "./CurrentMatchCard"
import { PlayerStatsCard } from "./PlayerStatsCard"
import { RecentMatchesCard } from "./RecentMatchesCard"
import { useEffect, useState } from "react"
import { getSettings } from "@/db/settings"
import { getReplayNames } from "@/db/replays"
import { ReplayLoadProgressBar } from "./ReplayLoadProgressBar"

export const LiveMatchDisplay = () => {
  const [hasReplayDirectory, setHasReplayDirectory] = useState(true)
  const [currentReplaysLoaded, setCurrentReplaysLoaded] = useState(0);
  const [totalReplaysToLoad, setTotalReplaysToLoad] = useState(1);
  const [isLoadingReplays, setIsLoadingReplays] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
        const {replayDirectory, isFastLoad} = await getSettings();
        setHasReplayDirectory(!!replayDirectory);
        if (!!replayDirectory) {
          const existingReplayNames = await getReplayNames();
          window.ipcRenderer.invoke('begin-loading-replays', { replayDirectory: replayDirectory, existingReplayNames, isFastLoad });
          setIsLoadingReplays(true);
        }
    }
    fetchSettings();
  }, [])

useEffect(() => {
  const updateReplayLoadProgress = (_event: any, args: any) => {
    const { currentReplaysLoaded, totalReplaysToLoad } = args;
    setCurrentReplaysLoaded(currentReplaysLoaded);
    setTotalReplaysToLoad(totalReplaysToLoad);
  }

  const endLoadingReplays = () => {
    setIsLoadingReplays(false);
  }

  window.ipcRenderer.on('update-replay-load-progress', updateReplayLoadProgress);
  window.ipcRenderer.on('end-loading-replays', endLoadingReplays)
  return () => {
    window.ipcRenderer.off('update-replay-load-progress', updateReplayLoadProgress);
    window.ipcRenderer.off('end-loading-replays', endLoadingReplays)
  }
}, [])

return (
    <Container component="main" sx={{ py: 3, flex: 1 }}>
      {!hasReplayDirectory && <Alert severity="error">Replay directory must be set in settings.</Alert>}
      {isLoadingReplays && (
        <Box sx={{width: '100%'}}>
          <ReplayLoadProgressBar value={(currentReplaysLoaded / totalReplaysToLoad) * 100} />
        </Box>
      )}
      <Stack spacing={3}>
        <DashboardHeader />

        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <CurrentMatchCard />
          </Grid>

          <Grid size={{xs: 12, md: 6}}>
            <PlayerStatsCard />
          </Grid>
        </Grid>

        <RecentMatchesCard />
      </Stack>
    </Container>
)
}
