import { LiveReplayPlayers } from "@/types";
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Grid,
} from "@mui/material";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { getCharacterNameFromId, getStageNameFromId } from "@/meleeIdUtils";
interface CurrentMatchCardProps {
  players: LiveReplayPlayers[];
  stageId: string;
}

export const CurrentMatchCard = ({
  players,
  stageId,
}: CurrentMatchCardProps) => {
  const playerOne = players[0];
  const playerTwo = players[1];
  // TODO stageId -> stage string
  // const stageId =

  return (
    <Card variant="outlined">
      <CardHeader title="Current Match" subheader="Live match information" />
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 96,
                height: 96,
                mx: "auto",
                bgcolor: "action.hover",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                }}
              >
                <img src={getCharacterIcon(playerOne.characterId)} />
              </Box>
            </Box>
            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: "bold" }}>
              {`${playerOne.name} (${playerOne.connectCode})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getCharacterNameFromId(playerOne.characterId)}
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            VS
          </Typography>

          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 96,
                height: 96,
                mx: "auto",
                bgcolor: "action.hover",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                }}
              >
                <img src={getCharacterIcon(playerTwo.characterId)} />
              </Box>
            </Box>
            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: "bold" }}>
              {`${playerTwo.name} (${playerTwo.connectCode})`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getCharacterNameFromId(playerTwo.characterId)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: "medium" }}>
            {getStageNameFromId(stageId)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
