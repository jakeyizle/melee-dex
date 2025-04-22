import { Paper, Typography, Box } from "@mui/material";

interface StatPaperProps {
  title: string;
  winCount: number;
  lossCount: number;
  colorCode: "#6366f1" | "#f59e0b" | "#10b981" | "#8b5cf6";
}

export const StatPaper = ({
  title,
  winCount,
  lossCount,
  colorCode,
}: StatPaperProps) => {
  const gameCount = winCount + lossCount;
  const winRate = gameCount === 0 ? 0 : (winCount / gameCount) * 100;
  const winRateText = gameCount === 0 ? "-" : `${Math.round(winRate)}%`;
  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: "rgba(99, 102, 241, 0.05)",
        borderLeft: `4px solid ${colorCode}`,
        borderRadius: 1,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
          {winRateText}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {winCount} wins - {lossCount} losses
          </Typography>
          <Box
            sx={{
              width: 150,
              height: 8,
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 4,
              overflow: "hidden",
              mt: 0.5,
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${winRate}%`,
                bgcolor: colorCode,
              }}
            />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
