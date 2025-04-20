import {
  Card,
  CardHeader,
  Box,
  Typography,
  CardContent,
  Stack,
  Paper,
  Grid,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useReplayStore } from "@/replayStore";
import { getUserStat } from "@/utils/statUtils";
import { useMemo } from "react";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";

export const UserStatsCard = () => {
  const { userStat, currentReplayInfo } = useReplayStore();
  if (!userStat || !currentReplayInfo)
    return <Typography>No stats found</Typography>;

  console.log("userStat", userStat);
  console.log("currentReplayInfo", currentReplayInfo);
  const player = currentReplayInfo.players.find(
    (player) => player.connectCode === userStat.userConnectCode,
  )!;
  const characterName = getCharacterNameFromId(player.characterId);

  const otherPlayer = currentReplayInfo?.players.find(
    (player) => player.connectCode !== userStat.userConnectCode,
  )!;
  const otherCharacterName = getCharacterNameFromId(otherPlayer.characterId);

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Your Stats Playing {characterName}
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "rgba(99, 102, 241, 0.05)",
                borderLeft: "4px solid #6366f1",
                borderRadius: 1,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Overall
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {userStat.overallWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStat.overallWinCount} wins -{" "}
                    {userStat.overallLossCount} losses
                  </Typography>
                  <Box
                    sx={{
                      width: 150,
                      height: 8,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 4,
                      overflow: "hidden",
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${userStat.overallWinRate}%`,
                        bgcolor: "#6366f1",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "rgba(245, 158, 11, 0.05)",
                borderLeft: "4px solid #f59e0b",
                borderRadius: 1,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                vs {otherCharacterName}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {userStat.currentMatchUpWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStat.currentMatchUpWinCount} wins -{" "}
                    {userStat.currentMatchUpLossCount} losses
                  </Typography>
                  <Box
                    sx={{
                      width: 150,
                      height: 8,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 4,
                      overflow: "hidden",
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${userStat.currentMatchUpWinRate}%`,
                        bgcolor: "#f59e0b",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "rgba(16, 185, 129, 0.05)",
                borderLeft: "4px solid #10b981",
                borderRadius: 1,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                On {getStageNameFromId(currentReplayInfo.stageId)}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {userStat.stageWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStat.stageWinCount} wins - {userStat.stageLossCount}{" "}
                    losses
                  </Typography>
                  <Box
                    sx={{
                      width: 150,
                      height: 8,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 4,
                      overflow: "hidden",
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${userStat.stageWinRate}%`,
                        bgcolor: "#10b981",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              sx={{
                p: 2,
                bgcolor: "rgba(139, 92, 246, 0.05)",
                borderLeft: "4px solid #8b5cf6",
                borderRadius: 1,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                vs {otherCharacterName} on{" "}
                {getStageNameFromId(currentReplayInfo.stageId)}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {userStat.currentMatchUpAndStageWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStat.currentMatchUpAndStageWinCount} wins -{" "}
                    {userStat.currentMatchUpAndStageLossCount} losses
                  </Typography>
                  <Box
                    sx={{
                      width: 150,
                      height: 8,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 4,
                      overflow: "hidden",
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${userStat.currentMatchUpAndStageWinRate}%`,
                        bgcolor: "#8b5cf6",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
