import { Replay } from "@/db/replays";
import { LiveReplayPlayers } from "@/types";
import { getHeadToHeadStats } from "@/utils/statUtils";
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

import { useMemo } from "react";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
interface PlayerStatsCardProps {
  players: LiveReplayPlayers[];
  historicalReplays: Replay[];
}

export const PlayerStatsCard = ({
  players,
  historicalReplays,
}: PlayerStatsCardProps) => {
  // const playerOne = players[0];
  // const playerTwo = players[1];
  // const playerOneWinCount = historicalReplays.filter(
  //   (replay) => replay.winnerConnectCode === playerOne.connectCode,
  // ).length;
  // const playerTwoWinCount = historicalReplays.length - playerOneWinCount;
  // const playerOneWinRate =
  //   Math.round((playerOneWinCount / historicalReplays.length) * 100 * 10) / 10;
  // const playerTwoWinRate = 100 - playerOneWinRate;

  const headToHeadStats = useMemo(
    () => getHeadToHeadStats(historicalReplays, players),
    [historicalReplays, players],
  );
  console.log(headToHeadStats);
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CompareArrowsIcon fontSize="small" />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Head-to-Head
            </Typography>
          </Box>
        }
        subheader="Player comparison and matchup stats"
      />
      {historicalReplays.length > 0 ? (
        <CardContent>
          {/* Overall W/L Record */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {`Overall Record (${historicalReplays.length} ${
                historicalReplays.length === 1 ? "game" : "games"
              })`}
            </Typography>
            <Paper sx={{ p: 2, bgcolor: "rgba(255, 255, 255, 0.05)" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                  >
                    {headToHeadStats[0].overallWinCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {players[0].connectCode}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mx: 1 }}>
                  -
                </Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "secondary.main" }}
                  >
                    {headToHeadStats[1].overallWinCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {players[1].connectCode}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 4,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${headToHeadStats[0].overallWinRate}%`,
                      bgcolor: "primary.main",
                    }}
                  />
                  <Box
                    sx={{
                      height: "100%",
                      width: `${headToHeadStats[1].overallWinRate}%`,
                      bgcolor: "secondary.main",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {headToHeadStats[0].overallWinRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {headToHeadStats[1].overallWinRate}%
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Current Matchup W/L Record */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {`${getCharacterNameFromId(players[0].characterId)} vs. ${getCharacterNameFromId(players[1].characterId)} Matchup`}
            </Typography>
            <Paper sx={{ p: 2, bgcolor: "rgba(255, 255, 255, 0.05)" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                  >
                    {headToHeadStats[0].currentMatchUpWinCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {`${getCharacterNameFromId(players[0].characterId)} wins`}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mx: 1 }}>
                  -
                </Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "secondary.main" }}
                  >
                    {headToHeadStats[1].currentMatchUpWinCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {`${getCharacterNameFromId(players[1].characterId)} wins`}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 4,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${headToHeadStats[0].currentMatchUpWinRate}%`,
                      bgcolor: "primary.main",
                    }}
                  />
                  <Box
                    sx={{
                      height: "100%",
                      width: `${headToHeadStats[1].currentMatchUpWinRate}%`,
                      bgcolor: "secondary.main",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {headToHeadStats[0].currentMatchUpWinRate}% win rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {headToHeadStats[1].currentMatchUpWinRate}% win rate
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Character Usage */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Most Played Characters
            </Typography>

            <Grid container spacing={2}>
              {/* Player 1 Characters */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: "medium", color: "primary.main" }}
                >
                  {players[0].connectCode}
                </Typography>
                <Stack spacing={1}>
                  {headToHeadStats[0].characterUsage.map((char) => (
                    <Box
                      key={char.characterId}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                        }}
                      >
                        <img
                          width={24}
                          height={24}
                          src={getCharacterIcon(char.characterId)}
                          alt=""
                        />
                        {/* {char.emoji} */}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">
                            {getCharacterNameFromId(char.characterId)}
                          </Typography>
                          <Typography variant="body2">
                            {char.playRate}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            mt: 0.5,
                            height: 6,
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${char.playRate}%`,
                              bgcolor: "primary.main",
                              opacity: 0.8,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>

              {/* Player 2 Characters */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: "medium", color: "secondary.main" }}
                >
                  {players[1].connectCode}
                </Typography>
                <Stack spacing={1}>
                  {headToHeadStats[1].characterUsage.map((char) => (
                    <Box
                      key={char.characterId}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        <img
                          width={24}
                          height={24}
                          src={getCharacterIcon(char.characterId)}
                          alt=""
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">
                            {getCharacterNameFromId(char.characterId)}
                          </Typography>
                          <Typography variant="body2">
                            {char.playRate}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            mt: 0.5,
                            height: 6,
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${char.playRate}%`,
                              bgcolor: "secondary.main",
                              opacity: 0.8,
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      ) : (
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            No Match History
          </Box>
        </CardContent>
      )}
    </Card>
  );
};
