import {
  Card,
  CardHeader,
  Box,
  Typography,
  CardContent,
  Stack,
  Paper,
  Grid,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useReplayStore } from "@/replayStore";
import { getUserStat } from "@/utils/statUtils";
import { useMemo } from "react";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
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

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {title}
            </Typography>
          </Box>
        }
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
