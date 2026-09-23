import { useReplayStore } from "@/replayStore";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Alert,
  AlertTitle,
} from "@mui/material";
import { LoadProgressBar } from "./LoadProgressBar";

export const ReplayLoadInProgressCard = () => {
  const {
    currentReplaysLoaded,
    totalReplaysToLoad,
    replaysPerSecond,
    isBackfilling,
  } = useReplayStore();

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            {isBackfilling ? "Updating Your Replays" : "Loading Replay Files"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isBackfilling
              ? "This version reads more out of each replay than the one that imported yours, so they are being read again. It only happens once."
              : "Please wait while your replay files are being processed. This may take a little while depending on how many files you have."}
          </Typography>
        </Box>

        <LoadProgressBar
          current={currentReplaysLoaded}
          total={totalReplaysToLoad}
          perSecondRate={replaysPerSecond}
        />

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
