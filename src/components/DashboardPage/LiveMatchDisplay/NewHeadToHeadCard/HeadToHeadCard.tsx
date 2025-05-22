import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import { StageStatisticsTable } from "./StageStatisticsTable";
import { useReplayStore } from "@/replayStore";
import { PlayerAvatar } from "./PlayerAvatar";
import { HeadToHeadScore } from "./HeadToHeadScore";
import { PaperDisplay } from "./PaperDisplay";
import { getTimeString } from "@/utils/displayUtils";
import { GamesPlayedPaperDisplay } from "./GamesPlayedPaperDisplay";
import { CharacterUsagePaper } from "./CharacterUsagePaper";
import { getCurrentHeadToHeadStats } from "@/utils/statUtils";

const getPercentageString = (percentage: number) => {
  return Math.round(percentage * 100) / 100 + "%";
};

export const HeadToHeadCard = () => {
  const { headToHeadStats, userConnectCode, currentReplayInfo } =
    useReplayStore();
  // const { statInfo, headToHeadReplays } = useReplayStore();
  if (!headToHeadStats || !currentReplayInfo) return null;

  const user = currentReplayInfo.players.find(
    (player) => player.connectCode === userConnectCode,
  );

  const opponent = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  );
  if (!user || !opponent) return null;

  // const firstMatchDate = () => {
  //   if (headToHeadReplays.length === 0) return "-";
  //   // sort by date
  //   const sortedReplays = headToHeadReplays.sort((b, a) => {
  //     return new Date(b.date).getTime() - new Date(a.date).getTime();
  //   });
  //   return getTimeString(sortedReplays[0].date);
  // };

  const playerOneColor = "orange";
  const playerTwoColor = "lightblue";

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
              Head to Head
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"start"}>
            <PlayerAvatar
              connectCode={user.connectCode}
              characterId={user.characterId}
              avatarBgColor={playerOneColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"center"}>
            <HeadToHeadScore
              winCount={headToHeadStats.overallStat.winCount}
              winColor={playerOneColor}
              lossCount={headToHeadStats.overallStat.lossCount}
              lossColor={playerTwoColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"end"}>
            <PlayerAvatar
              connectCode={opponent.connectCode}
              characterId={opponent.characterId}
              isFlipped
              avatarBgColor={playerTwoColor}
            />
          </Grid>

          <Grid size={{ xs: 4 }}>
            <GamesPlayedPaperDisplay
              stat={headToHeadStats.overallStat}
              playerOneColor={playerOneColor}
              playerTwoColor={playerTwoColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Win Rate"
              value={getPercentageString(headToHeadStats.overallStat.winRate)}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            {/* <PaperDisplay title="First Seen" value={firstMatchDate()} /> */}
            <PaperDisplay title="First Seen" value={'TODO'} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" color="text.primary">
              Matchup Stats
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <GamesPlayedPaperDisplay
              stat={matchupHeadToHeadStat}
              playerOneColor={playerOneColor}
              playerTwoColor={playerTwoColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <PaperDisplay
              title="Win Rate"
              value={getPercentageString(matchupHeadToHeadStat.winRate)}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper sx={{ p: 2, bgcolor: "rgba(99, 102, 241, 0.05)" }}>
              <Typography variant="body2" color="text.secondary">
                Best Stage
              </Typography>
              <Typography variant="h6" color="text.primary">
                TODO
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <CharacterUsagePaper
              playerConnectCode={statInfo.userInfo.connectCode}
              characterUsageStats={statInfo.userInfo.characterUsage}
              color={playerOneColor}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <CharacterUsagePaper
              playerConnectCode={statInfo.opponentInfo.connectCode}
              characterUsageStats={statInfo.opponentInfo.characterUsage}
              color={playerTwoColor}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box display="flex" flexDirection="column">
              <Typography variant="h6" color="text.primary" ml={2}>
                Stage Statistics
              </Typography>
              <StageStatisticsTable />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
