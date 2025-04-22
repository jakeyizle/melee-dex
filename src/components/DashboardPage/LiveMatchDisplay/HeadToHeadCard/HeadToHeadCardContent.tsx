import { StatPaper } from "@/components/StatPaper";
import { HeadToHeadStat } from "@/types";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { CardContent, Grid, Paper, Typography, Box } from "@mui/material";

interface HeadToHeadCardContentProps {
  headToHeadStats: HeadToHeadStat[];
  stageId: string;
}

export const HeadToHeadCardContent = ({
  headToHeadStats,
  stageId,
}: HeadToHeadCardContentProps) => {
  return (
    <CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title="Overall"
            winCount={headToHeadStats[0].overallWinCount}
            lossCount={headToHeadStats[0].overallLossCount}
            colorCode="#6366f1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)}`}
            winCount={headToHeadStats[0].currentMatchUpWinCount}
            lossCount={headToHeadStats[0].currentMatchUpLossCount}
            colorCode="#f59e0b"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`On ${getStageNameFromId(stageId)}`}
            winCount={headToHeadStats[0].stageWinCount}
            lossCount={headToHeadStats[0].stageLossCount}
            colorCode="#10b981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <StatPaper
            title={`vs ${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)} on ${getStageNameFromId(stageId)}`}
            winCount={headToHeadStats[0].currentMatchUpAndStageWinCount}
            lossCount={headToHeadStats[0].currentMatchUpAndStageLossCount}
            colorCode="#8b5cf6"
          />
        </Grid>
      </Grid>
    </CardContent>
  );
};
