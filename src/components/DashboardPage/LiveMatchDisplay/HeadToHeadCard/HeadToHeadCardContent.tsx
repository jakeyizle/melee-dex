import { StatPaper } from "@/components/StatPaper";
import { StatInfo } from "@/types";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { CardContent, Grid, Paper, Typography, Box } from "@mui/material";

interface HeadToHeadCardContentProps {
  statInfo: StatInfo;
  stageId: string;
}

export const HeadToHeadCardContent = ({
  statInfo,
  stageId,
}: HeadToHeadCardContentProps) => {
  return (
    <CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title="Overall"
            winCount={
              statInfo.headToHeadStat.find((stat) => stat.type === "overall")
                ?.winCount || 0
            }
            lossCount={
              statInfo.headToHeadStat.find((stat) => stat.type === "overall")
                ?.lossCount || 0
            }
            colorCode="#6366f1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${getCharacterNameFromId(statInfo.opponentInfo.currentCharacterId)}`}
            winCount={
              statInfo.headToHeadStat.find(
                (stat) => stat.type === "currentMatchUp",
              )?.winCount || 0
            }
            lossCount={
              statInfo.headToHeadStat.find(
                (stat) => stat.type === "currentMatchUp",
              )?.lossCount || 0
            }
            colorCode="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`On ${getStageNameFromId(stageId)}`}
            winCount={
              statInfo.headToHeadStat.find((stat) => stat.type === "stage")
                ?.winCount || 0
            }
            lossCount={
              statInfo.headToHeadStat.find((stat) => stat.type === "stage")
                ?.lossCount || 0
            }
            colorCode="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${getCharacterNameFromId(statInfo.opponentInfo.currentCharacterId)} on ${getStageNameFromId(stageId)}`}
            winCount={
              statInfo.headToHeadStat.find(
                (stat) => stat.type === "currentMatchUpAndStage",
              )?.winCount || 0
            }
            lossCount={
              statInfo.headToHeadStat.find(
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
