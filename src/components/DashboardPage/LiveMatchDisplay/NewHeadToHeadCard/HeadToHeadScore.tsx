import { Typography } from "@mui/material";

interface HeadToHeadScoreProps {
  winCount: number;
  lossCount: number;
  winColor?: string;
  lossColor?: string;
}

export const HeadToHeadScore = ({
  winCount,
  lossCount,
  winColor,
  lossColor,
}: HeadToHeadScoreProps) => {
  return (
    <Typography variant="h4" fontWeight="bold">
      <Typography
        color={winColor}
        component="span"
        variant="h4"
        fontWeight="bold"
      >
        {winCount}
      </Typography>{" "}
      -{" "}
      <Typography
        color={lossColor}
        component="span"
        variant="h4"
        fontWeight="bold"
      >
        {lossCount}
      </Typography>
    </Typography>
  );
};
