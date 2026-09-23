import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { PaperDisplay } from "@/components/PaperDisplay";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { MatchupStat, OpponentStats } from "@/types";
import { best } from "@/utils/arrayUtils";

const getPercentageString = (percentage: number | undefined) => {
  return percentage !== undefined
    ? Math.round(percentage * 100) / 100 + "%"
    : "-";
};

const matchupString = (matchup: MatchupStat | undefined) =>
  matchup
    ? `${getCharacterNameFromId(matchup.userCharacterId)} vs ${getCharacterNameFromId(matchup.opponentCharacterId)} (${matchup.winCount} - ${matchup.lossCount})`
    : "-";

const opponentRecordString = (opponent: OpponentStats | undefined) =>
  opponent
    ? `${opponent.opponentConnectCode} (${opponent.overallStat.winCount} - ${opponent.overallStat.lossCount})`
    : "-";

export const OverallStatsCard = () => {
  const { newStatInfo } = useReplayStore();

  if (!newStatInfo) return null;

  const overallStat = newStatInfo.stats.overallStat;
  const opponentSpecificStats = newStatInfo.opponentSpecificStats;
  const matchupStats = newStatInfo.stats.matchupStats;

  const netRecord = (stats: OpponentStats) =>
    stats.overallStat.winCount - stats.overallStat.lossCount;
  const netMatchup = (stat: MatchupStat) => stat.winCount - stat.lossCount;

  const mostPlayed = best(
    opponentSpecificStats,
    (a, b) => b.overallStat.totalCount - a.overallStat.totalCount,
  );
  const victim = best(opponentSpecificStats, (a, b) => netRecord(b) - netRecord(a));
  const rival = best(opponentSpecificStats, (a, b) => netRecord(a) - netRecord(b));

  const mostCommonMatchup = best(
    matchupStats,
    (a, b) => b.totalCount - a.totalCount,
  );
  const leastCommonMatchup = best(
    matchupStats,
    (a, b) => a.totalCount - b.totalCount,
  );
  const bestMatchup = best(matchupStats, (a, b) => netMatchup(b) - netMatchup(a));
  const worstMatchup = best(matchupStats, (a, b) => netMatchup(a) - netMatchup(b));

  return (
    <Card
      sx={{
        height: "100%",
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Overall Stats
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={1}>
          <Grid size={{ xs: 5 }}>
            <PaperDisplay
              title="Total Games Played"
              value={`${overallStat.totalCount} (${overallStat.winCount} - ${overallStat.lossCount})`}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="Win Rate"
              value={getPercentageString(overallStat.winRate)}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Number of Opponents Seen"
              value={opponentSpecificStats.length}
            />
          </Grid>

          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Most Played Opponent"
              value={mostPlayed?.opponentConnectCode ?? "-"}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Best Record (W/L)"
              value={opponentRecordString(victim)}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Worst Record (W/L)"
              value={opponentRecordString(rival)}
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Most Common Matchup"
              value={matchupString(mostCommonMatchup)}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Least Common Matchup"
              value={matchupString(leastCommonMatchup)}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Best Matchup"
              value={matchupString(bestMatchup)}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Worst Matchup"
              value={matchupString(worstMatchup)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
