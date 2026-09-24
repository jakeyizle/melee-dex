import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { Box, Avatar, Typography } from "@mui/material";
import { RankProfile } from "@/types";
import { RankBadge } from "./RankBadge";

interface PlayerAvatarProps {
  connectCode: string;
  characterId: string;
  avatarBgColor?: string;
  isFlipped?: boolean;
  /** Absent until the lookup lands, and null when it failed. */
  rank?: RankProfile | null;
}

export const PlayerAvatar = ({
  connectCode,
  characterId,
  avatarBgColor,
  isFlipped,
  rank,
}: PlayerAvatarProps) => {
  const label = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: isFlipped ? "flex-end" : "flex-start",
      }}
    >
      <Typography
        variant="subtitle1"
        color={avatarBgColor}
        sx={{
          fontWeight: "bold",
        }}
      >
        {connectCode}
      </Typography>
      <RankBadge rank={rank} />
    </Box>
  );

  if (isFlipped) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <Box sx={{ mr: 1 }}>{label}</Box>
        <Avatar
          src={getCharacterIcon(characterId)}
          sx={{ bgcolor: avatarBgColor }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <Avatar
        src={getCharacterIcon(characterId)}
        sx={{ bgcolor: avatarBgColor }}
      />
      <Box sx={{ ml: 1 }}>{label}</Box>
    </Box>
  );
};
