import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { Box, Avatar, Typography } from "@mui/material";

interface PlayerAvatarProps {
  connectCode: string;
  characterId: string;
  avatarBgColor?: string;
  isFlipped?: boolean;
}

export const PlayerAvatar = ({
  connectCode,
  characterId,
  avatarBgColor,
  isFlipped,
}: PlayerAvatarProps) => {
  if (isFlipped) {
    return (
      <Box display="flex" alignItems="center">
        <Box sx={{ mr: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            color={avatarBgColor}
          >
            {connectCode}
          </Typography>
        </Box>
        <Avatar
          src={getCharacterIcon(characterId)}
          sx={{ bgcolor: avatarBgColor }}
        />
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center">
      <Avatar
        src={getCharacterIcon(characterId)}
        sx={{ bgcolor: avatarBgColor }}
      />
      <Box sx={{ ml: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" color={avatarBgColor}>
          {connectCode}
        </Typography>
      </Box>
    </Box>
  );
};
