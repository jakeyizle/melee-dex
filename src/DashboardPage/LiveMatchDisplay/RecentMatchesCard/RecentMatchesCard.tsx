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
import { RecentMatchesCardEmptyContent } from "./RecentMatchesCardEmptyCardContent";
import { RecentMatchesCardContent } from "./RecentMatchesCardContent";

export const RecentMatchesCard = () => {
  const { headToHeadReplays, userStat, currentReplayInfo } = useReplayStore();

  const otherPlayerCode = currentReplayInfo?.players.find(
    (player) => player.connectCode !== userStat?.userConnectCode,
  )?.connectCode;

  const subheader = otherPlayerCode ? `Against ${otherPlayerCode}` : "";
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Last 5 Matches
          </Typography>
        }
        subheader={subheader}
      />
      {headToHeadReplays.length > 0 && userStat && otherPlayerCode ? (
        <RecentMatchesCardContent
          headToHeadReplays={headToHeadReplays}
          userStat={userStat}
          otherPlayerCode={otherPlayerCode}
        />
      ) : (
        <RecentMatchesCardEmptyContent />
      )}
    </Card>
  );
};
