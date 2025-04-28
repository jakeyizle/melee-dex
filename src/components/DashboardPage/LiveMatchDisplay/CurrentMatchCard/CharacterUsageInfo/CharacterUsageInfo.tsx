import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { PlayerInfo } from "@/types";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { Grid, Typography, Stack, Box, Divider } from "@mui/material";
import { PlayerCharacterUsage } from "./PlayerCharacterUsage";
import { EmptyCharacterUsageInfo } from "./EmptyCharacterUsageInfo";

interface CharacterUsageInfoProps {
  playerOneInfo: PlayerInfo | undefined;
  playerTwoInfo: PlayerInfo | undefined;
}

export const CharacterUsageInfo = ({
  playerOneInfo,
  playerTwoInfo,
}: CharacterUsageInfoProps) => {
  if (
    !playerOneInfo ||
    playerOneInfo.characterUsage.length === 0 ||
    !playerTwoInfo ||
    playerTwoInfo.characterUsage.length === 0
  )
    return <EmptyCharacterUsageInfo />;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="body2" color="text.secondary">
          Character Usage
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, sm: 5.5 }}>
        <PlayerCharacterUsage playerInfo={playerOneInfo} />
      </Grid>

      <Grid size={{ xs: 1 }}>
        <Divider orientation="vertical" sx={{ my: 0.5, mr: 1 }} />
      </Grid>

      <Grid size={{ xs: 12, sm: 5.5 }}>
        <PlayerCharacterUsage playerInfo={playerTwoInfo} />
      </Grid>
    </Grid>
  );
};
