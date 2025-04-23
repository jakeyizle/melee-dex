import { Card, CardHeader, Box, Typography } from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { UserStatsCardContent } from "./UserStatsCardContent";
import { UserStatsCardEmptyContent } from "./UserStatsCardEmptyContent";

export const UserStatsCard = () => {
  const { statInfo, currentReplayInfo } = useReplayStore();
  const user = currentReplayInfo?.players.find(
    (player) => player.connectCode === statInfo?.userInfo.connectCode,
  );
  const otherPlayer = currentReplayInfo?.players.find(
    (player) => player.connectCode !== statInfo?.userInfo.connectCode,
  );

  const characterName = getCharacterNameFromId(user?.characterId || "");
  const otherCharacterName = getCharacterNameFromId(
    otherPlayer?.characterId || "",
  );
  const stageId = currentReplayInfo?.stageId;

  const numberOfGames =
    statInfo?.userStat.find((stat) => stat.type === "overall")?.totalCount || 0;
  const numberOfGamesText =
    numberOfGames > 0 && statInfo
      ? `${numberOfGames} ${numberOfGames === 1 ? "game" : "games"} played as ${characterName}`
      : "";
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Your Stats
            </Typography>
          </Box>
        }
        subheader={numberOfGamesText}
      />
      {statInfo && otherCharacterName && stageId ? (
        <UserStatsCardContent
          statInfo={statInfo}
          otherCharacterName={otherCharacterName}
          stageId={stageId}
        />
      ) : (
        <UserStatsCardEmptyContent />
      )}
    </Card>
  );
};
