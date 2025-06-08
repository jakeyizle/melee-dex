import { getStageNameFromId } from "@/utils/meleeIdUtils";
import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface StatsTableProps {
  overallStageStats: {
    stageId: string;
    totalCount: number;
    winCount: number;
    lossCount: number;
    winRate: number;
  }[];
  matchupStageStats: {
    stageId: string;
    totalCount: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    userCharacterId: string;
    opponentCharacterId: string;
  }[];
}

export const StatsTable = ({
  overallStageStats,
  matchupStageStats,
}: StatsTableProps) => {
  const sortedStats = overallStageStats.sort(
    (a, b) => b.totalCount - a.totalCount,
  );
  const stages = [...new Set(sortedStats.map((stat) => stat.stageId))];
  return (
    <TableContainer component={Paper}>
      <Table size="small" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography variant="subtitle2" color="text.secondary">
                Stage
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2" color="text.secondary">
                Overall Games
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2" color="text.secondary">
                Overall W/L (%)
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2" color="text.secondary">
                Matchup Games
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle2" color="text.secondary">
                Matchup W/L (%)
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stages.map((stageId) => {
            const overallStat = overallStageStats.find(
              (stat) => stat.stageId === stageId,
            );
            const matchupStat = matchupStageStats.find(
              (stat) => stat.stageId === stageId,
            );
            return (
              <TableRow key={stageId}>
                <TableCell>{getStageNameFromId(stageId)}</TableCell>
                <TableCell align="right">
                  {overallStat ? overallStat.totalCount : "-"}
                </TableCell>
                <TableCell align="right">
                  {overallStat
                    ? `${overallStat.winCount} - ${overallStat.lossCount} (${overallStat.winRate}%)`
                    : "-"}
                </TableCell>
                <TableCell align="right">
                  {matchupStat ? matchupStat.totalCount : "-"}
                </TableCell>
                <TableCell align="right">
                  {matchupStat
                    ? `${matchupStat.winCount} - ${matchupStat.lossCount} (${matchupStat.winRate}%)`
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
