import { Box, Paper, Tooltip, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useReplayStore } from "@/replayStore";

export const DashboardHeader = () => {
  const { isLoadingReplays, totalReplayCount, totalBadReplayCount } =
    useReplayStore();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="h4" component="h2" sx={{ fontWeight: "bold" }}>
        Dashboard
      </Typography>
      {!isLoadingReplays && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
          <Tooltip title="Some replays are rejected due to errors or being invalid (ex: CPU matches, doubles, data corruption)">
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ErrorOutlineIcon
                fontSize="small"
                sx={{ color: "text.secondary", opacity: 0.7 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "medium" }}
              >
                {totalBadReplayCount} rejected
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};
