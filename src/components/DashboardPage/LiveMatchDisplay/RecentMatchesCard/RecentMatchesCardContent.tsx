import { getMostRecentMatches } from "@/utils/statUtils";
import { CardContent, Stack } from "@mui/material";
import { RecentMatchRow } from "./RecentMatchRow";
import { Replay } from "@/db/replays";

interface RecentMatchesCardContentProps {
  headToHeadReplays: Replay[];
  userConnectCode: string;
}

export const RecentMatchesCardContent = ({
  headToHeadReplays,
  userConnectCode,
}: RecentMatchesCardContentProps) => {
  const recentReplays = getMostRecentMatches(headToHeadReplays, 5);

  return (
    <CardContent>
      <Stack spacing={2}>
        {recentReplays.map((replay) => (
          <RecentMatchRow
            replay={replay}
            userConnectCode={userConnectCode}
            key={replay.name}
          />
        ))}
      </Stack>
    </CardContent>
  );
};
