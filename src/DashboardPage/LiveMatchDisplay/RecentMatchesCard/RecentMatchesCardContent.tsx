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
import { Replay } from "@/db/replays";
import { UserStat, CurrentReplayInfo } from "@/types";

interface RecentMatchesCardContentProps {
  headToHeadReplays: Replay[];
  userStat: UserStat;
  otherPlayerCode: string;
}

export const RecentMatchesCardContent = ({
  headToHeadReplays,
  userStat,
  otherPlayerCode,
}: RecentMatchesCardContentProps) => {
  const recentReplays = getMostRecentMatches(headToHeadReplays, 5);

  return (
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
  );
};
