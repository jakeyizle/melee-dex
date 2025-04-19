import { Box, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { ReplayLoadProgressBar } from "./ReplayLoadProgressBar";
import { useEffect, useState } from "react";
import { selectReplayCount } from "@/db/replays";
import { useReplayStore } from "@/replayStore";

export const ReplayInfoDisplay = () => {
  const {
    currentReplaysLoaded,
    totalReplaysToLoad,
    isLoadingReplays,
    replaysPerSecond,
  } = useReplayStore();

  if (isLoadingReplays) {
    return (
      <Box sx={{ width: "100%" }} mb={3}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: "medium",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {totalReplaysToLoad === 0
            ? "Loading replays..."
            : `Loaded ${currentReplaysLoaded} of ${totalReplaysToLoad} replays (${replaysPerSecond} replays per second)`}
        </Typography>
        <ReplayLoadProgressBar
          value={
            totalReplaysToLoad === 0
              ? 0
              : (currentReplaysLoaded / totalReplaysToLoad) * 100
          }
        />
      </Box>
    );
  }
};
