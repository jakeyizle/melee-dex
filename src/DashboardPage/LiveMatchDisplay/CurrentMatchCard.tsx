import { LiveReplayPlayers } from "@/types";
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Container,
} from "@mui/material";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { useReplayStore } from "@/replayStore";

export const CurrentMatchCard = () => {
  const { currentReplayInfo } = useReplayStore();
  if (!currentReplayInfo) return null;
  const playerOne = currentReplayInfo.players[0];
  const playerTwo = currentReplayInfo.players[1];
  const stageId = currentReplayInfo.stageId;

  return (
    <Card
      sx={{
        mb: 3,
      }}
    >
      <CardHeader title="Current Match" />
      <CardContent>
        {/* <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            {getStageNameFromId(stageId)}
          </Typography>
        </Box> */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                mx: "auto",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
                border: "2px solid rgba(99, 102, 241, 0.3)",
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
              {playerOne.connectCode}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {getCharacterNameFromId(playerOne.characterId)}
            </Typography>
          </Box>

          <Box sx={{ mx: 2, textAlign: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
              VS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getStageNameFromId(stageId)}
            </Typography>
          </Box>

          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                mx: "auto",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
                border: "2px solid rgba(245, 158, 11, 0.3)",
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
              {playerTwo.connectCode}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {getCharacterNameFromId(playerTwo.characterId)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
