import { Box, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { ReplayLoadProgressBar } from "./ReplayLoadProgressBar";

interface ReplayInfoDisplayProps {
  currentCount: number;
  totalCount: number;
  isLoadInProgress: boolean;
}

export const ReplayInfoDisplay = ({
  currentCount,
  totalCount,
  isLoadInProgress,
}: ReplayInfoDisplayProps) => {
  if (currentCount === 0 && totalCount === 0) return null;
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
          Loading Replays...
        </Typography>
        <ReplayLoadProgressBar value={(currentCount / totalCount) * 100} />
      </Box>
    );
  } else {
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
            {totalCount} replays loaded
          </Typography>
        </Paper>
      </Box>
    );
  }
};
