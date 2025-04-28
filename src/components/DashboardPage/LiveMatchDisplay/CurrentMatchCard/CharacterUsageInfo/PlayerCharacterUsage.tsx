import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { PlayerInfo } from "@/types";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { Stack, Box, Typography } from "@mui/material";

interface PlayerCharacterUsageProps {
  playerInfo: PlayerInfo;
}

export const PlayerCharacterUsage = ({
  playerInfo,
}: PlayerCharacterUsageProps) => {
  return (
    <Stack spacing={1}>
      {playerInfo.characterUsage.map((char) => (
        <Box
          key={char.characterId}
          sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            <img
              width={24}
              height={24}
              src={getCharacterIcon(char.characterId)}
              alt=""
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2">
                {getCharacterNameFromId(char.characterId)}
              </Typography>
              <Typography variant="body2">{char.playRate}%</Typography>
            </Box>
            <Box
              sx={{
                mt: 0.5,
                height: 6,
                bgcolor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${char.playRate}%`,
                  bgcolor: "primary.main",
                  opacity: 0.8,
                }}
              />
            </Box>
          </Box>
        </Box>
      ))}
    </Stack>
  );
};
