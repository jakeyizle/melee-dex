import { Box, LinearProgress, Paper, Typography } from "@mui/material";
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

  const percentage =
    totalReplaysToLoad === 0
      ? 0
      : Math.round((currentReplaysLoaded / totalReplaysToLoad) * 100);

  const labelText =
    totalReplaysToLoad === 0
      ? "Checking for new replays..."
      : `Loaded ${currentReplaysLoaded} of ${totalReplaysToLoad} replays (${replaysPerSecond} replays per second)`;

  if (isLoadingReplays) {
    return (
      <Box
        sx={{
          position: "relative",
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          ml: 2,
        }}
      >
        <Box sx={{ width: "100%", mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#2196f3",
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: -16,
              left: 0,
              // right: 0,
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {labelText}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ minWidth: "40px", textAlign: "right" }}
        >
          {percentage}%
        </Typography>
      </Box>
    );
  }
};
