import { useReplayStore } from "@/replayStore";
import { Typography, Card, CardHeader } from "@mui/material";
import { RecentMatchesCardEmptyContent } from "./RecentMatchesCardEmptyCardContent";
import { RecentMatchesCardContent } from "./RecentMatchesCardContent";

export const RecentMatchesCard = () => {
  const { headToHeadReplays, statInfo, currentReplayInfo } = useReplayStore();

  const otherPlayerCode = currentReplayInfo?.players.find(
    (player) => player.connectCode !== statInfo?.userInfo.connectCode,
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
      {headToHeadReplays.length > 0 && statInfo && otherPlayerCode ? (
        <RecentMatchesCardContent
          headToHeadReplays={headToHeadReplays}
          userConnectCode={statInfo.userInfo.connectCode}
        />
      ) : (
        <RecentMatchesCardEmptyContent />
      )}
    </Card>
  );
};
