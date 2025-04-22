import { getMostRecentMatches } from "@/utils/statUtils";
import { CardContent, Stack } from "@mui/material";
import { RecentMatchRow } from "./RecentMatchRow";
import { Replay } from "@/db/replays";
import { UserStat } from "@/types";

interface RecentMatchesCardContentProps {
  headToHeadReplays: Replay[];
  userStat: UserStat;
}

export const RecentMatchesCardContent = ({
  headToHeadReplays,
  userStat,
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
