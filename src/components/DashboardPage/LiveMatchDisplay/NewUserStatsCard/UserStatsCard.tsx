import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { PaperDisplay } from "../PaperDisplay";
import { getTimeString } from "@/utils/displayUtils";
import { GamesPlayedPaperDisplay } from "../GamesPlayedPaperDisplay";
import { useEffect, useState } from "react";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { MatchupStat } from "@/types";

const getPercentageString = (percentage: number | undefined) => {
  return percentage !== undefined
    ? Math.round(percentage * 100) / 100 + "%"
    : "-";
};

export const UserStatsCard = () => {
  const { newStatInfo } = useReplayStore();

  if (!newStatInfo) return null;

  const overallStat = newStatInfo.stats.overallStat;
  const opponentSpecificStats = newStatInfo.opponentSpecificStats;
  const matchupStats = newStatInfo.stats.matchupStats;

  const victim = opponentSpecificStats.sort(
    (a, b) =>
      b.overallStat.winCount -
      b.overallStat.lossCount -
      (a.overallStat.winCount - a.overallStat.lossCount),
  )[0];

  const rival = opponentSpecificStats.sort(
    (a, b) =>
      a.overallStat.winCount -
      a.overallStat.lossCount -
      (b.overallStat.winCount - b.overallStat.lossCount),
  )[0];

  const mostCommonMatchup = matchupStats.sort(
    (a, b) => b.totalCount - a.totalCount,
  )[0];

  const leastCommonMatchup = matchupStats.sort(
    (a, b) => a.totalCount - b.totalCount,
  )[0];

  const bestMatchup = matchupStats.sort(
    (a, b) => b.winCount - b.lossCount - (a.winCount - a.lossCount),
  )[0];

  const worstMatchup = matchupStats.sort(
    (a, b) => a.winCount - a.lossCount - (b.winCount - b.lossCount),
  )[0];

  console.log(
    matchupStats.sort(
      (a, b) => a.winCount - a.lossCount - (b.winCount - b.lossCount),
    ),
  );

  const matchupString = (matchup: MatchupStat) => {
    return `${getCharacterNameFromId(matchup.userCharacterId)} vs ${getCharacterNameFromId(matchup.opponentCharacterId)} (${matchup.winCount} - ${matchup.lossCount})`;
  };
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
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Total Games Played"
              value={`${overallStat.totalCount} (${overallStat.winCount} - ${overallStat.lossCount})`}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
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
              value={
                opponentSpecificStats.sort(
                  (a, b) => b.overallStat.totalCount - a.overallStat.totalCount,
                )[0].opponentConnectCode
              }
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Best Record (W/L)"
              value={`${victim.opponentConnectCode} (${victim.overallStat.winCount} - ${victim.overallStat.lossCount})`}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Worst Record (W/L)"
              value={`${rival.opponentConnectCode} (${rival.overallStat.winCount} - ${rival.overallStat.lossCount})`}
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

          {/* <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="Most Losses"
              value={getTimeString(headToHeadStats.opponentStats.lastMatchDate)}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="Last Match"
              value={getTimeString(headToHeadStats.opponentStats.lastMatchDate)}
            />
          </Grid> */}
        </Grid>
      </CardContent>
    </Card>
  );
};
