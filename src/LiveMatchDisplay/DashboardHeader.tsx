import { Box, Paper, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useReplayStore } from "@/replayStore";

export const DashboardHeader = () => {
  const { isLoadingReplays, totalReplayCount } = useReplayStore();
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
        <Box sx={{ display: "flex", alignItems: "center" }}>
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
      )}
    </Box>
  );
};
