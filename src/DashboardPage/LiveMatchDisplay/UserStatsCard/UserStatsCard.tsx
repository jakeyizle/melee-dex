import { Card, CardHeader, Box, Typography } from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { UserStatsCardContent } from "./UserStatsCardContent";
import { UserStatsCardEmptyContent } from "./UserStatsCardEmptyContent";

export const UserStatsCard = () => {
  const { userStat, currentReplayInfo } = useReplayStore();
  const player = currentReplayInfo?.players.find(
    (player) => player.connectCode === userStat?.userConnectCode,
  );
  const otherPlayer = currentReplayInfo?.players.find(
    (player) => player.connectCode !== userStat?.userConnectCode,
  );

  const characterName = getCharacterNameFromId(player?.characterId || "");
  const otherCharacterName = getCharacterNameFromId(
    otherPlayer?.characterId || "",
  );
  const stageId = currentReplayInfo?.stageId;

  const title = characterName
    ? `Your Stats Playing ${characterName}`
    : "Your Stats";

  const subheader = userStat
    ? `${userStat.overallWinCount + userStat.overallLossCount} games played`
    : "";
  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {title}
            </Typography>
          </Box>
        }
        subheader={subheader}
      />
      {userStat && otherCharacterName && stageId ? (
        <UserStatsCardContent
          userStat={userStat}
          otherCharacterName={otherCharacterName}
          stageId={stageId}
        />
      ) : (
        <UserStatsCardEmptyContent />
      )}
    </Card>
  );
};
