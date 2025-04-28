import { CurrentReplayInfo, StatInfo } from "@/types";
import { Typography, Box, CardContent, Stack } from "@mui/material";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { getStageNameFromId } from "@/utils/meleeIdUtils";
import CharacterUsageInfo from "./CharacterUsageInfo";

interface CurrentMatchCardContentProps {
  currentReplayInfo: CurrentReplayInfo;
  statInfo: StatInfo | null;
}

export const CurrentMatchCardContent = ({
  currentReplayInfo,
  statInfo,
}: CurrentMatchCardContentProps) => {
  const playerOne = currentReplayInfo.players[0];
  const playerTwo = currentReplayInfo.players[1];
  const stageId = currentReplayInfo.stageId;

  const playerOneInfo =
    statInfo?.userInfo.connectCode === playerOne.connectCode
      ? statInfo.userInfo
      : statInfo?.opponentInfo;
  const playerTwoInfo =
    statInfo?.userInfo.connectCode === playerTwo.connectCode
      ? statInfo.userInfo
      : statInfo?.opponentInfo;

  return (
    <CardContent>
      <Stack spacing={3}>
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
                width: 45,
                height: 45,
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
                <img
                  width={40}
                  height={40}
                  src={getCharacterIcon(playerOne.characterId)}
                />
              </Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: "bold" }}>
              {playerOne.connectCode}
            </Typography>
          </Box>

          <Box sx={{ mx: 1, textAlign: "center" }}>
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
                width: 45,
                height: 45,
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
                <img
                  width={40}
                  height={40}
                  src={getCharacterIcon(playerTwo.characterId)}
                />
              </Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: "bold" }}>
              {playerTwo.connectCode}
            </Typography>
          </Box>
        </Box>

        <CharacterUsageInfo
          playerOneInfo={playerOneInfo}
          playerTwoInfo={playerTwoInfo}
        />
      </Stack>
    </CardContent>
  );
};
