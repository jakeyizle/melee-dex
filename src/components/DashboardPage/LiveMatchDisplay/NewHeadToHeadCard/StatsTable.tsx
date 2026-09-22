import { getStageNameFromId, LEGAL_STAGE_IDS } from "@/utils/meleeIdUtils";
import { type StageStat, type MatchupAndStageStat } from "@/types";
import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
} from "@mui/material";
import { getPercentageString } from "@/utils/displayUtils";

interface StatsTableProps {
  overallStageStats: StageStat[];
  overallMatchupStageStats: MatchupAndStageStat[];

  opponentStageStats: StageStat[];
  opponentMatchupStageStats: MatchupAndStageStat[];

  opponentConnectCode: string;
}

interface StatsTableRow {
  stageName: string;

  allGamesTotalCount: string;
  allGamesWinLoss: string;
  allGamesWinLossPercent: number;

  allGamesMatchupCount: string;
  allGamesMatchupWinLoss: string;
  allGamesMatchupWinLossPercent: number;

  againstOpponentTotalCount: string;
  againstOpponentWinLoss: string;
  againstOpponentWinLossPercent: number;

  againstOpponentMatchupCount: string;
  againstOpponentMatchupWinLoss: string;
  againstOpponentMatchupWinLossPercent: number;
}

// export const StatsTable = ({
//   overallStageStats,
//   matchupStageStats,
// }: StatsTableProps) => {
//   const sortedStats = overallStageStats.sort(
//     (a, b) => b.totalCount - a.totalCount,
//   );
//   const stages = [...new Set(sortedStats.map((stat) => stat.stageId))];
//   return (
//     <TableContainer component={Paper}>
//       <Table size="small" sx={{ minWidth: 650 }}>
//         <TableHead>
//           <TableRow>
//             <TableCell colSpan={1} align="center">
//               <Typography
//                 variant="subtitle2"
//                 color="text.secondary"
//               ></Typography>
//             </TableCell>
//             <TableCell colSpan={4} align="center">
//               <Typography variant="subtitle2" color="text.secondary">
//                 All Games
//               </Typography>
//             </TableCell>
//             <TableCell colSpan={4} align="center">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Against Opponent
//               </Typography>
//             </TableCell>
//           </TableRow>
//           <TableRow>
//             <TableCell>
//               <Typography variant="subtitle2" color="text.secondary">
//                 Stage
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Overall Games
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Overall W/L (%)
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Matchup Games
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Matchup W/L (%)
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Overall Games
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Overall W/L (%)
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Matchup Games
//               </Typography>
//             </TableCell>
//             <TableCell align="right">
//               <Typography variant="subtitle2" color="text.secondary">
//                 Matchup W/L (%)
//               </Typography>
//             </TableCell>
//           </TableRow>
//         </TableHead>
//         <TableBody>
//           {stages.map((stageId) => {
//             const overallStat = overallStageStats.find(
//               (stat) => stat.stageId === stageId,
//             );
//             const matchupStat = matchupStageStats.find(
//               (stat) => stat.stageId === stageId,
//             );
//             return (
//               <TableRow key={stageId}>
//                 <TableCell>{getStageNameFromId(stageId)}</TableCell>
//                 <TableCell align="right">
//                   {overallStat ? overallStat.totalCount : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {overallStat
//                     ? `${overallStat.winCount} - ${overallStat.lossCount} (${overallStat.winRate}%)`
//                     : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {matchupStat ? matchupStat.totalCount : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {matchupStat
//                     ? `${matchupStat.winCount} - ${matchupStat.lossCount} (${matchupStat.winRate}%)`
//                     : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {overallStat ? overallStat.totalCount : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {overallStat
//                     ? `${overallStat.winCount} - ${overallStat.lossCount} (${overallStat.winRate}%)`
//                     : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {matchupStat ? matchupStat.totalCount : "-"}
//                 </TableCell>
//                 <TableCell align="right">
//                   {matchupStat
//                     ? `${matchupStat.winCount} - ${matchupStat.lossCount} (${matchupStat.winRate}%)`
//                     : "-"}
//                 </TableCell>
//               </TableRow>
//             );
//           })}
//         </TableBody>
//       </Table>
//     </TableContainer>
//   );
// };

const gameData = [
  {
    stage: "Pokémon Stadium",
    allGames: {
      overall: 12,
      wl: "2 - 10",
      percent: 16.7,
      matchup: 12,
      matchupWL: "2 - 10",
      matchupPercent: 16.7,
    },
    againstOpponent: {
      overall: 12,
      wl: "2 - 10",
      percent: 16.7,
      matchup: 12,
      matchupWL: "2 - 10",
      matchupPercent: 16.7,
    },
  },
  {
    stage: "Dream Land N64",
    allGames: {
      overall: 4,
      wl: "2 - 2",
      percent: 50,
      matchup: 4,
      matchupWL: "2 - 2",
      matchupPercent: 50,
    },
    againstOpponent: {
      overall: 4,
      wl: "2 - 2",
      percent: 50,
      matchup: 4,
      matchupWL: "2 - 2",
      matchupPercent: 50,
    },
  },
  {
    stage: "Battlefield",
    allGames: {
      overall: 3,
      wl: "3 - 0",
      percent: 100,
      matchup: 3,
      matchupWL: "3 - 0",
      matchupPercent: 100,
    },
    againstOpponent: {
      overall: 3,
      wl: "3 - 0",
      percent: 100,
      matchup: 3,
      matchupWL: "3 - 0",
      matchupPercent: 100,
    },
  },
  {
    stage: "Yoshi's Story",
    allGames: {
      overall: 2,
      wl: "2 - 0",
      percent: 100,
      matchup: 2,
      matchupWL: "2 - 0",
      matchupPercent: 100,
    },
    againstOpponent: {
      overall: 2,
      wl: "2 - 0",
      percent: 100,
      matchup: 2,
      matchupWL: "2 - 0",
      matchupPercent: 100,
    },
  },
  {
    stage: "Final Destination",
    allGames: {
      overall: 2,
      wl: "2 - 0",
      percent: 100,
      matchup: 2,
      matchupWL: "2 - 0",
      matchupPercent: 100,
    },
    againstOpponent: {
      overall: 2,
      wl: "2 - 0",
      percent: 100,
      matchup: 2,
      matchupWL: "2 - 0",
      matchupPercent: 100,
    },
  },
  {
    stage: "Fountain of Dreams",
    allGames: {
      overall: 1,
      wl: "0 - 1",
      percent: 0,
      matchup: 1,
      matchupWL: "0 - 1",
      matchupPercent: 0,
    },
    againstOpponent: {
      overall: 1,
      wl: "0 - 1",
      percent: 0,
      matchup: 1,
      matchupWL: "0 - 1",
      matchupPercent: 0,
    },
  },
];

function getWinRateColor(percent: number) {
  if (percent === -1) return;
  percent = percent * 100;
  if (percent >= 75) return "#4ade80"; // green-400
  if (percent >= 50) return "#facc15"; // yellow-400
  if (percent >= 25) return "#fb923c"; // orange-400
  return "#f87171"; // red-400
}

export const StatsTable = ({
  overallStageStats,
  overallMatchupStageStats,
  opponentStageStats,
  opponentMatchupStageStats,
  opponentConnectCode,
}: StatsTableProps) => {
  const rows = getTableRows(
    overallStageStats,
    overallMatchupStageStats,
    opponentStageStats,
    opponentMatchupStageStats,
  );
  return (
    <Box>
      <Paper
        elevation={1}
        sx={{
          bgcolor: "#111827",
          border: "1px solid #374151",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Header */}

        <TableContainer>
          <Table size="small">
            <TableHead>
              {/* Main category headers */}
              <TableRow
                sx={{
                  bgcolor: "rgba(31, 41, 55, 0.5)",
                  "& .MuiTableCell-root": {
                    borderColor: "#374151",
                  },
                }}
              >
                <TableCell
                  sx={{
                    color: "#e5e7eb",
                    fontWeight: 600,
                    py: 1,
                    px: 2,
                    borderRight: "1px solid #374151",
                  }}
                >
                  Stage
                </TableCell>
                <TableCell
                  align="center"
                  colSpan={4}
                  sx={{
                    color: "#e5e7eb",
                    fontWeight: 600,
                    py: 1,
                    px: 1,
                    borderRight: "1px solid #374151",
                    bgcolor: "rgba(30, 58, 138, 0.2)",
                  }}
                >
                  All Games
                </TableCell>
                <TableCell
                  align="center"
                  colSpan={4}
                  sx={{
                    color: "#e5e7eb",
                    fontWeight: 600,
                    py: 1,
                    px: 1,
                    bgcolor: "rgba(88, 28, 135, 0.2)",
                  }}
                >
                  {`Against ${opponentConnectCode}`}
                </TableCell>
              </TableRow>

              {/* Sub-headers */}
              <TableRow
                sx={{
                  bgcolor: "#1f2937",
                  "& .MuiTableCell-root": {
                    borderColor: "#374151",
                  },
                }}
              >
                <TableCell
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 2,
                    borderRight: "1px solid #374151",
                  }}
                />

                {/* All Games section */}
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    Overall
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    W/L
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(30, 58, 138, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    Matchup
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(30, 58, 138, 0.1)",
                    borderRight: "1px solid #374151",
                  }}
                >
                  <Typography variant="caption" display="block">
                    M W/L
                  </Typography>
                </TableCell>

                {/* Against Opponent section */}
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(88, 28, 135, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    Overall
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(88, 28, 135, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    W/L
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(88, 28, 135, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    Matchup
                  </Typography>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: "#d1d5db",
                    py: 0.5,
                    px: 1,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    bgcolor: "rgba(88, 28, 135, 0.1)",
                  }}
                >
                  <Typography variant="caption" display="block">
                    M W/L
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={row.stageName}
                  sx={{
                    bgcolor:
                      index % 2 === 0
                        ? "rgba(17, 24, 39, 0.5)"
                        : "rgba(17, 24, 39, 0.8)",
                    "&:hover": {
                      bgcolor: "rgba(31, 41, 55, 0.7)",
                    },
                    transition: "background-color 0.2s",
                    "& .MuiTableCell-root": {
                      borderColor: "#374151",
                    },
                  }}
                >
                  {/* Stage name */}
                  <TableCell
                    sx={{
                      color: "#f3f4f6",
                      fontWeight: 500,
                      py: 1,
                      px: 2,
                      borderRight: "1px solid #374151",
                    }}
                  >
                    {row.stageName}
                  </TableCell>

                  {/* All Games section */}
                  <TableCell
                    align="center"
                    sx={{
                      color: "#e5e7eb",
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(30, 58, 138, 0.05)",
                    }}
                  >
                    {row.allGamesTotalCount}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(30, 58, 138, 0.05)",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#d1d5db",
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.allGamesWinLoss}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinRateColor(row.allGamesWinLossPercent),
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        (
                        {row.allGamesWinLossPercent != -1 &&
                          getPercentageString(row.allGamesWinLossPercent)}
                        )
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      color: "#e5e7eb",
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(30, 58, 138, 0.05)",
                    }}
                  >
                    {row.allGamesMatchupCount}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(30, 58, 138, 0.05)",
                      borderRight: "1px solid #374151",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#d1d5db",
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.allGamesMatchupWinLoss}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinRateColor(
                            row.allGamesMatchupWinLossPercent,
                          ),
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        (
                        {getPercentageString(row.allGamesMatchupWinLossPercent)}
                        )
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Against Opponent section */}
                  <TableCell
                    align="center"
                    sx={{
                      color: "#e5e7eb",
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(88, 28, 135, 0.05)",
                    }}
                  >
                    {row.againstOpponentTotalCount}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(88, 28, 135, 0.05)",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#d1d5db",
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.againstOpponentWinLoss}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinRateColor(
                            row.againstOpponentWinLossPercent,
                          ),
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        (
                        {row.againstOpponentWinLossPercent != -1 &&
                          getPercentageString(
                            row.againstOpponentWinLossPercent,
                          )}
                        )
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      color: "#e5e7eb",
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(88, 28, 135, 0.05)",
                    }}
                  >
                    {row.againstOpponentMatchupCount}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      py: 0.5,
                      px: 1,
                      bgcolor: "rgba(88, 28, 135, 0.05)",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#d1d5db",
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.againstOpponentMatchupWinLoss}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: getWinRateColor(
                            row.againstOpponentMatchupWinLossPercent,
                          ),
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      >
                        {row.againstOpponentMatchupWinLossPercent != -1 &&
                          `(${getPercentageString(
                            row.againstOpponentMatchupWinLossPercent,
                          )})`}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

const getTableRows = (
  allGamesStageStats: StageStat[],
  allGamesMatchupStageStats: MatchupAndStageStat[],
  opponentStageStats: StageStat[],
  opponentMatchupStageStats: MatchupAndStageStat[],
) => {
  const rows: StatsTableRow[] = [];

  LEGAL_STAGE_IDS.map((stageId) => stageId.toString()).forEach((stageId) => {
    const overallStat = allGamesStageStats.find(
      (stat) => stat.stageId === stageId,
    );
    const overallMatchupStat = allGamesMatchupStageStats.find(
      (stat) => stat.stageId === stageId,
    );
    const opponentStat = opponentStageStats.find(
      (stat) => stat.stageId === stageId,
    );
    const opponentMatchupStat = opponentMatchupStageStats.find(
      (stat) => stat.stageId === stageId,
    );

    const row: StatsTableRow = {
      stageName: getStageNameFromId(stageId),
      allGamesTotalCount: overallStat ? overallStat.totalCount.toString() : "-",
      allGamesWinLoss: overallStat
        ? `${overallStat.winCount} - ${overallStat.lossCount}`
        : "-",
      allGamesWinLossPercent: overallStat ? overallStat.winRate : -1,

      allGamesMatchupCount: overallMatchupStat
        ? overallMatchupStat.totalCount.toString()
        : "-",
      allGamesMatchupWinLoss: overallMatchupStat
        ? `${overallMatchupStat.winCount} - ${overallMatchupStat.lossCount}`
        : "-",
      allGamesMatchupWinLossPercent: overallMatchupStat
        ? overallMatchupStat.winRate
        : -1,

      againstOpponentTotalCount: opponentStat
        ? opponentStat.totalCount.toString()
        : "-",
      againstOpponentWinLoss: opponentStat
        ? `${opponentStat.winCount} - ${opponentStat.lossCount}`
        : "-",
      againstOpponentWinLossPercent: opponentStat ? opponentStat.winRate : -1,

      againstOpponentMatchupCount: opponentMatchupStat
        ? opponentMatchupStat.totalCount.toString()
        : "-",
      againstOpponentMatchupWinLoss: opponentMatchupStat
        ? `${opponentMatchupStat.winCount} - ${opponentMatchupStat.lossCount}`
        : "-",
      againstOpponentMatchupWinLossPercent: opponentMatchupStat
        ? opponentMatchupStat.winRate
        : -1,
    };
    rows.push(row);
  });
  return rows;
};
