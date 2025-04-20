import { Box, Typography, LinearProgress } from "@mui/material";

interface LoadProgressBarProps {
  current: number;
  total: number;
  perSecondRate: number;
}

export const LoadProgressBar = ({
  current,
  total,
  perSecondRate,
}: LoadProgressBarProps) => {
  const loadProgress = Math.round((current / total) * 100);

  if (total === 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, display: "flex", justifyContent: "space-between" }}
        >
          <span>Beginning Load</span>
        </Typography>
        <LinearProgress
          sx={{
            height: 10,
            borderRadius: 1,
            bgcolor: "rgba(255, 255, 255, 0.1)",
          }}
        />
      </Box>
    );
  }

  return (
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
          Replays processed: {current} / {total}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {perSecondRate} replays per second
        </Typography>
      </Box>
    </Box>
  );
};
