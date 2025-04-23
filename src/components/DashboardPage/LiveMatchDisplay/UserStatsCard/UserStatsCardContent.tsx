import { Box, Typography, CardContent, Paper, Grid } from "@mui/material";
import { getStageNameFromId } from "@/utils/meleeIdUtils";
import { StatInfo } from "@/types";
import { StatPaper } from "@/components/StatPaper";

interface UserStatsCardContentProps {
  statInfo: StatInfo;
  otherCharacterName: string;
  stageId: string;
}

export const UserStatsCardContent = ({
  statInfo,
  otherCharacterName,
  stageId,
}: UserStatsCardContentProps) => {
  return (
    <CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title="Overall"
            winCount={
              statInfo.userStat.find((stat) => stat.type === "overall")
                ?.winCount || 0
            }
            lossCount={
              statInfo.userStat.find((stat) => stat.type === "overall")
                ?.lossCount || 0
            }
            colorCode="#6366f1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${otherCharacterName}`}
            winCount={
              statInfo.userStat.find((stat) => stat.type === "currentMatchUp")
                ?.winCount || 0
            }
            lossCount={
              statInfo.userStat.find((stat) => stat.type === "currentMatchUp")
                ?.lossCount || 0
            }
            colorCode="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`On ${getStageNameFromId(stageId)}`}
            winCount={
              statInfo.userStat.find((stat) => stat.type === "stage")
                ?.winCount || 0
            }
            lossCount={
              statInfo.userStat.find((stat) => stat.type === "stage")
                ?.lossCount || 0
            }
            colorCode="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${otherCharacterName} on ${getStageNameFromId(stageId)}`}
            winCount={
              statInfo.userStat.find(
                (stat) => stat.type === "currentMatchUpAndStage",
              )?.winCount || 0
            }
            lossCount={
              statInfo.userStat.find(
                (stat) => stat.type === "currentMatchUpAndStage",
              )?.lossCount || 0
            }
            colorCode="#8b5cf6"
          />
        </Grid>
      </Grid>
    </CardContent>
  );
};
