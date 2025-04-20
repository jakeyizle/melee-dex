import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { Replay } from "@/db/replays";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { Box, Paper, Typography } from "@mui/material";

interface RecentMatchRowProps {
  replay: Replay;
  userConnectCode: string;
}
export const RecentMatchRow = ({
  replay,
  userConnectCode,
}: RecentMatchRowProps) => {
  const winnerCharacterIcon = getCharacterIcon(
    replay.players.find(
      (player) => player.connectCode === replay.winnerConnectCode,
    )?.characterId || "",
  );
  const userCharacterName = getCharacterNameFromId(
    replay.players.find((player) => player.connectCode === userConnectCode)
      ?.characterId || "",
  );
  const otherCharacterId =
    replay.players.find((player) => player.connectCode !== userConnectCode)
      ?.characterId || "";
  const otherCharacterName = getCharacterNameFromId(otherCharacterId);

  const getTimeString = (matchDate: string) => {
    const date = new Date(matchDate);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) {
      return `${Math.floor(diff / 1000)} seconds ago`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return date.toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <Paper
      key={replay.name}
      variant="outlined"
      sx={{
        p: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src={winnerCharacterIcon} width={35} height={35} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: "medium" }}>
            {replay.winnerConnectCode}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userCharacterName} vs {otherCharacterName}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {getTimeString(replay.date)}
      </Typography>
    </Paper>
  );
};
