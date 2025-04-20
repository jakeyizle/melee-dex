import { useReplayStore } from "@/replayStore";
import { getMostRecentMatches } from "@/utils/statUtils";
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Stack,
} from "@mui/material";
import { RecentMatchRow } from "./RecentMatchRow";

export const RecentMatchesCard = () => {
  const { headToHeadReplays, userStat, currentReplayInfo } = useReplayStore();
  if (headToHeadReplays?.length === 0 || !userStat || !currentReplayInfo)
    return null;

  const otherPlayerCode = currentReplayInfo.players.find(
    (player) => player.connectCode !== userStat.userConnectCode,
  )?.connectCode;

  const recentReplays = getMostRecentMatches(headToHeadReplays, 5);
  console.log(recentReplays);
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Last 5 Matches
          </Typography>
        }
        subheader={`Against ${otherPlayerCode}`}
      />
      <CardContent>
        <Stack spacing={2}>
          {recentReplays.map((replay) => (
            <RecentMatchRow
              replay={replay}
              userConnectCode={userStat.userConnectCode}
              key={replay.name}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
