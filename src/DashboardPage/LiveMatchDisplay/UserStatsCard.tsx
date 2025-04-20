import {
  Card,
  CardHeader,
  Box,
  Typography,
  CardContent,
  Stack,
  Paper,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useReplayStore } from "@/replayStore";
import { getUserStats } from "@/utils/statUtils";
import { useMemo } from "react";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";

export const UserStatsCard = () => {
  const { userReplays, currentReplayInfo, currentUserConnectCode } =
    useReplayStore();

  const userStats = useMemo(
    () =>
      getUserStats(
        userReplays,
        currentReplayInfo?.players,
        currentReplayInfo?.stageId || "",
        currentUserConnectCode,
      ),
    [userReplays, currentReplayInfo, currentUserConnectCode],
  );

  const player = currentReplayInfo?.players.find(
    (player) => player.connectCode === currentUserConnectCode,
  )!;
  const characterName = getCharacterNameFromId(player.characterId);

  const otherPlayer = currentReplayInfo?.players.find(
    (player) => player.connectCode !== currentUserConnectCode,
  )!;
  const otherCharacterName = getCharacterNameFromId(otherPlayer.characterId);

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon fontSize="small" />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Your Stats
            </Typography>
          </Box>
        }
        subheader={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {characterName}
            </Typography>
          </Box>
        }
      />
      {!currentReplayInfo || !userStats ? (
        <Typography>No stats found</Typography>
      ) : (
        <CardContent>
          <Stack spacing={2}>
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
                  {userStats.overallWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStats.overallWinCount} wins -{" "}
                    {userStats.overallLossCount} losses
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
                        width: `${userStats.overallWinRate}%`,
                        bgcolor: "#6366f1",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
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
                  {userStats.currentMatchUpWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStats.currentMatchUpWinCount} wins -{" "}
                    {userStats.currentMatchUpLossCount} losses
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
                        width: `${userStats.currentMatchUpWinRate}%`,
                        bgcolor: "#f59e0b",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>

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
                  {userStats.stageWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStats.stageWinCount} wins - {userStats.stageLossCount}{" "}
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
                        width: `${userStats.stageWinRate}%`,
                        bgcolor: "#10b981",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>

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
                  {userStats.currentMatchUpAndStageWinRate}%
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {userStats.currentMatchUpAndStageWinCount} wins -{" "}
                    {userStats.currentMatchUpAndStageLossCount} losses
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
                        width: `${userStats.currentMatchUpAndStageWinRate}%`,
                        bgcolor: "#8b5cf6",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
};
