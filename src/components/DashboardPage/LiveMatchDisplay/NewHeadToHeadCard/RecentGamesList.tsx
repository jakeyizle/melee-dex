import { Box, Chip, Stack, Typography } from "@mui/material";
import { Replay } from "@/db/replays";
import { getCharacterNameFromId, getStageNameFromId } from "@/utils/meleeIdUtils";
import { getTimeString, getDurationString } from "@/utils/displayUtils";

interface RecentGamesListProps {
  replays: Replay[];
  userConnectCode: string;
  winColor: string;
  lossColor: string;
}

/**
 * The last few games against this opponent. Queried per game rather than kept
 * in the running stats — see `selectRecentReplaysAgainst` — so it arrives a
 * moment after the rest of the card and is simply absent until it does.
 */
export const RecentGamesList = ({
  replays,
  userConnectCode,
  winColor,
  lossColor,
}: RecentGamesListProps) => {
  if (replays.length === 0) return null;

  return (
    <Stack spacing={1}>
      {replays.map((replay) => {
        const isWin = replay.winnerConnectCode === userConnectCode;
        const user = replay.players.find(
          (player) => player.connectCode === userConnectCode,
        );
        const opponent = replay.players.find(
          (player) => player.connectCode !== userConnectCode,
        );

        return (
          <Box
            key={replay.name}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1,
              borderRadius: 1,
              bgcolor: "rgba(99, 102, 241, 0.05)",
            }}
          >
            <Chip
              size="small"
              label={isWin ? "W" : "L"}
              sx={{
                fontWeight: "bold",
                color: isWin ? winColor : lossColor,
                borderColor: isWin ? winColor : lossColor,
              }}
              variant="outlined"
            />
            <Typography variant="body2" color="text.primary" sx={{ flex: 1 }}>
              {getCharacterNameFromId(user?.characterId ?? "")} vs{" "}
              {getCharacterNameFromId(opponent?.characterId ?? "")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getStageNameFromId(replay.stageId)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 44, textAlign: "right" }}
            >
              {getDurationString(replay.lastFrame)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 110, textAlign: "right" }}
            >
              {getTimeString(replay.date)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};
