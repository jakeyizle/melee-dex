import { Box, Typography, CardContent, Paper, Grid } from "@mui/material";
import { getStageNameFromId } from "@/utils/meleeIdUtils";
import { UserStat } from "@/types";
import { StatPaper } from "@/components/StatPaper";

interface UserStatsCardContentProps {
  userStat: UserStat;
  otherCharacterName: string;
  stageId: string;
}

export const UserStatsCardContent = ({
  userStat,
  otherCharacterName,
  stageId,
}: UserStatsCardContentProps) => {
  return (
    <CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title="Overall"
            winCount={userStat.overallWinCount}
            lossCount={userStat.overallLossCount}
            colorCode="#6366f1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${otherCharacterName}`}
            winCount={userStat.currentMatchUpWinCount}
            lossCount={userStat.currentMatchUpLossCount}
            colorCode="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`On ${getStageNameFromId(stageId)}`}
            winCount={userStat.stageWinCount}
            lossCount={userStat.stageLossCount}
            colorCode="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${otherCharacterName} on ${getStageNameFromId(stageId)}`}
            winCount={userStat.currentMatchUpAndStageWinCount}
            lossCount={userStat.currentMatchUpAndStageLossCount}
            colorCode="#8b5cf6"
          />
        </Grid>
      </Grid>
    </CardContent>
  );
};
