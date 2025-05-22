import { BaseStat } from "@/types";
import { Paper, Typography } from "@mui/material";

interface GamesPlayedDisplayProps {
  stat: {
    totalCount: number;
    winCount: number;
    lossCount: number;
  };
  playerOneColor: string;
  playerTwoColor: string;
}

export const GamesPlayedPaperDisplay = ({
  stat,
  playerOneColor,
  playerTwoColor,
}: GamesPlayedDisplayProps) => {
  const winCount = (
    <Typography color={playerOneColor} component="span" variant="h6">
      {stat.winCount}
    </Typography>
  );

  const lossCount = (
    <Typography color={playerTwoColor} component="span" variant="h6">
      {stat.lossCount}
    </Typography>
  );
  return (
    <Paper sx={{ p: 2, bgcolor: "rgba(99, 102, 241, 0.05)" }}>
      <Typography variant="body2" color="text.secondary">
        Games Played
      </Typography>
      <Typography variant="h6" color="text.primary">
        {stat.totalCount} ({winCount} - {lossCount})
      </Typography>
    </Paper>
  );
};
