import { Box, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { ReplayLoadProgressBar } from "./ReplayLoadProgressBar";
import { useEffect, useState } from "react";
import { selectReplayCount } from "@/db/replays";

interface ReplayInfoDisplayProps {
  currentLoadCount: number;
  totalLoadCount: number;
  isLoadInProgress: boolean;
}

export const ReplayInfoDisplay = ({
  currentLoadCount,
  totalLoadCount,
  isLoadInProgress,
}: ReplayInfoDisplayProps) => {
  const [totalReplayCount, setTotalReplayCount] = useState(0);

  useEffect(() => {
    const fetchReplayCount = async () => {
      const replayCount = await selectReplayCount();
      setTotalReplayCount(replayCount);
    };
    if (isLoadInProgress) return;
    fetchReplayCount();
  }, [isLoadInProgress]);

  if (isLoadInProgress && currentLoadCount === 0 && totalLoadCount === 0)
    return null;
  if (isLoadInProgress) {
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
          Loaded {currentLoadCount} of {totalLoadCount} replays
        </Typography>
        <ReplayLoadProgressBar
          value={(currentLoadCount / totalLoadCount) * 100}
        />
      </Box>
    );
  } else if (totalReplayCount > 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center" }} mb={3}>
        <Paper sx={{ p: 1, bgcolor: "action.hover" }} variant="outlined">
          <Typography
            variant="body1"
            sx={{
              fontWeight: "medium",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CheckCircleIcon fontSize="small" color="success" />
            {totalReplayCount} replays loaded
          </Typography>
        </Paper>
      </Box>
    );
  }
};
