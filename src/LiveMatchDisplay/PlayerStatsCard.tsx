import { Replay } from "@/db/replays"
import { LiveReplayPlayers } from "@/types"
import {
    Typography,
    Box,
    Card,
    CardHeader,
    CardContent,
    Grid,
    Paper,
    Stack,
  } from "@mui/material"

interface PlayerStatsCardProps {
  players: LiveReplayPlayers[]
  historicalReplays: Replay[]
}

export const PlayerStatsCard = ({ players, historicalReplays }: PlayerStatsCardProps) => {
    const playerOne = players[0];
    const playerTwo = players[1];
    const playerOneWinCount = historicalReplays.filter((replay) => replay.winnerConnectCode === playerOne.connectCode).length;
    const playerTwoWinCount = historicalReplays.length - playerOneWinCount;
  const playerOneWinRate = (playerOneWinCount / historicalReplays.length) * 100;
  const playerTwoWinRate = (100 - playerOneWinRate);
    return (
        <Card variant="outlined">
        <CardHeader
          title="Matchup Stats"
        />
        <CardContent>
        <Box sx={{ mb: 2, pb: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                      {historicalReplays.length === 1 ? `${historicalReplays.length} game played` : `${historicalReplays.length} games played`}
                    </Typography>
                  </Box>
          {historicalReplays.length > 0 ? (<Stack spacing={2}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">{playerOne.connectCode}</Typography>

              </Box>
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Win rate</Typography>
                  <Typography variant="body2">{playerOneWinRate}%</Typography>
                </Box>
                <Box sx={{ mt: 0.5, height: 8, bgcolor: "action.hover", borderRadius: 4, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${playerOneWinRate}%`, bgcolor: "success.main" }} />
                </Box>
              </Box>
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">{playerTwo.connectCode}</Typography>
 
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Win rate</Typography>
                  <Typography variant="body2">{playerTwoWinRate}%</Typography>
                </Box>
                <Box sx={{ mt: 0.5, height: 8, bgcolor: "action.hover", borderRadius: 4, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${playerTwoWinRate}%`, bgcolor: "success.main" }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Matchup History
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{xs: 6}}>
                  <Paper sx={{ p: 1, bgcolor: "action.hover" }} variant='outlined'>
                    <Typography variant="body2">{`${playerOne.connectCode} vs ${playerTwo.connectCode}`}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {`${playerOneWinCount} - ${playerTwoWinCount}`}
                    </Typography>
                  </Paper>
                </Grid>
                {/* <Grid size={{xs: 6}}>
                  <Paper sx={{ p: 1, bgcolor: "action.hover" }} variant='outlined'>
                    <Typography variant="body2">Fox vs Falco</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      12 - 8
                    </Typography>
                  </Paper>
                </Grid> */}
              </Grid>
            </Box>
          </Stack>) : (
            <Typography variant="body1" sx={{ fontWeight: "medium" }}>
              No historical data available
            </Typography>
          )
          }
        </CardContent>
      </Card>
    )
}