import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { CharacterUsageStat } from "@/types";
import { getPercentageString } from "@/utils/displayUtils";
import { Paper, Typography, Grid, Box, Avatar } from "@mui/material";

interface CharacterUsagePaperProps {
  playerConnectCode: string;
  color: string;
  characterUsageStats: CharacterUsageStat[];
}

const CharacterUsageAvatar = ({
  character,
  percentage,
  color,
}: {
  character: string;
  percentage: string;
  color: string;
}) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Avatar
        sx={{ bgcolor: color }}
        src={getCharacterIcon(character)}
      ></Avatar>
      <Typography variant="body2" color="text.primary">
        {percentage}
      </Typography>
    </Box>
  );
};

export const CharacterUsagePaper = ({
  playerConnectCode,
  characterUsageStats,
  color,
}: CharacterUsagePaperProps) => {
  characterUsageStats = characterUsageStats
    .sort((a, b) => b.playRate - a.playRate)
    .slice(0, 3);
  const characterAvatars = characterUsageStats.map((stat) => {
    return (
      <Grid size={{ xs: 4 }} key={stat.characterId}>
        <CharacterUsageAvatar
          character={stat.characterId}
          percentage={getPercentageString(stat.playRate)}
          color={color}
        />
      </Grid>
    );
  });
  return (
    <Paper sx={{ p: 2, bgcolor: "rgba(99, 102, 241, 0.05)" }}>
      <Typography variant="body2" color="text.secondary" mb={1}>
        <Typography variant="body2" component="span" color={color}>
          {playerConnectCode}
        </Typography>{" "}
        Character Usage
      </Typography>
      <Grid container spacing={3}>
        {characterAvatars}
      </Grid>
    </Paper>
  );
};
