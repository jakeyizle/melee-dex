import { useReplayStore } from "@/replayStore";
import {
  Card,
  CardContent,
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";

export const ReplayLoadInProgressCard = () => {
  const { currentReplaysLoaded, totalReplaysToLoad, replaysPerSecond } =
    useReplayStore();

  const loadProgress =
    totalReplaysToLoad === 0
      ? 0
      : Math.round((currentReplaysLoaded / totalReplaysToLoad) * 100);

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Loading Replay Files
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please wait while your replay files are being processed. This may
            take a little while depending on how many files you have.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1, display: "flex", justifyContent: "space-between" }}
          >
            <span>Progress</span>
            <span>{loadProgress}%</span>
          </Typography>
          <LinearProgress
            variant="determinate"
            value={loadProgress}
            sx={{
              height: 10,
              borderRadius: 1,
              bgcolor: "rgba(255, 255, 255, 0.1)",
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Replays processed: {currentReplaysLoaded} / {totalReplaysToLoad}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {replaysPerSecond} replays per second
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Listening for new games is disabled</AlertTitle>
          While loading replays, the app cannot listen for new games. This
          process will automatically complete, and listening will resume when
          finished.
        </Alert>
      </CardContent>
    </Card>
  );
};
