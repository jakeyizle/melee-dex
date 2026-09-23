import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { StageStat } from "@/types";
import { getStageNameFromId, LEGAL_STAGE_IDS } from "@/utils/meleeIdUtils";

interface StageStatsTableProps {
  stageStats: StageStat[];
}

/**
 * Win rate colours the number rather than a bar: the table is read down a
 * column looking for the outlier, not compared row by row.
 */
const getWinRateColor = (winRate: number | undefined) => {
  if (winRate === undefined) return undefined;
  if (winRate >= 75) return "#4ade80";
  if (winRate >= 50) return "#facc15";
  if (winRate >= 25) return "#fb923c";
  return "#f87171";
};

/**
 * The user's record on each tournament-legal stage.
 *
 * Every legal stage gets a row whether or not it has been played, so the gaps
 * are as legible as the totals — "never played here" is an answer. Stage ids
 * are strings everywhere else in the app, so `LEGAL_STAGE_IDS` (the one place
 * they are numbers) is converted before comparing.
 */
export const StageStatsTable = ({ stageStats }: StageStatsTableProps) => {
  const rows = LEGAL_STAGE_IDS.map((stageId) => stageId.toString()).map(
    (stageId) => ({
      stageId,
      stageName: getStageNameFromId(stageId),
      stat: stageStats.find((stat) => stat.stageId === stageId),
    }),
  );

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Stage</TableCell>
            <TableCell align="right">Games</TableCell>
            <TableCell align="right">Record</TableCell>
            <TableCell align="right">Win Rate</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ stageId, stageName, stat }) => (
            <TableRow key={stageId}>
              <TableCell>{stageName}</TableCell>
              <TableCell align="right">{stat?.totalCount ?? "-"}</TableCell>
              <TableCell align="right">
                {stat ? `${stat.winCount} - ${stat.lossCount}` : "-"}
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ color: getWinRateColor(stat?.winRate) }}
                >
                  {stat ? `${stat.winRate}%` : "-"}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
