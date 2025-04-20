import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Grid,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { useReplayStore } from "@/replayStore";

export const HeadToHeadCard = () => {
  const { headToHeadStats, currentReplayInfo } = useReplayStore();
  const numberOfGames =
    headToHeadStats[0].overallWinCount + headToHeadStats[0].overallLossCount;

  return (
    <Card sx={{ mb: 3, height: "100%" }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Head-to-Head
            </Typography>
          </Box>
        }
      />
      {headToHeadStats.length > 0 && currentReplayInfo ? (
        <CardContent>
          <Grid container spacing={2}>
            {/* Overall W/L Record */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  {`Overall Record (${numberOfGames} ${
                    numberOfGames === 1 ? "game" : "games"
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
                        {headToHeadStats[0].connectCode}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "secondary.main" }}
                      >
                        {headToHeadStats[1].overallWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {headToHeadStats[1].connectCode}
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
            </Grid>
            {/* Current Matchup W/L Record */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  {`${getCharacterNameFromId(headToHeadStats[0].currentCharacterId)} vs. ${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)}`}
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
                        {`${getCharacterNameFromId(headToHeadStats[0].currentCharacterId)} wins`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "secondary.main" }}
                      >
                        {headToHeadStats[1].currentMatchUpWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {`${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)} wins`}
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
                        {headToHeadStats[0].currentMatchUpWinRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {headToHeadStats[1].currentMatchUpWinRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Grid>
            {/* Stage W/L Record */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  {`On ${getStageNameFromId(currentReplayInfo.stageId)}`}
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
                        {headToHeadStats[0].stageWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {headToHeadStats[0].connectCode}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "secondary.main" }}
                      >
                        {headToHeadStats[1].stageWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {headToHeadStats[1].connectCode}
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
                          width: `${headToHeadStats[0].stageWinRate}%`,
                          bgcolor: "primary.main",
                        }}
                      />
                      <Box
                        sx={{
                          height: "100%",
                          width: `${headToHeadStats[1].stageWinRate}%`,
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
                        {headToHeadStats[0].stageWinRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {headToHeadStats[1].stageWinRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Grid>
            {/* Stage and current matchup W/L Record */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  {`${getCharacterNameFromId(headToHeadStats[0].currentCharacterId)} vs. ${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)} on ${getStageNameFromId(currentReplayInfo.stageId)}`}
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
                        {headToHeadStats[0].currentMatchUpAndStageWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {`${getCharacterNameFromId(headToHeadStats[0].currentCharacterId)} wins`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: "bold", color: "secondary.main" }}
                      >
                        {headToHeadStats[1].currentMatchUpAndStageWinCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {`${getCharacterNameFromId(headToHeadStats[1].currentCharacterId)} wins`}
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
                          width: `${headToHeadStats[0].currentMatchUpAndStageWinRate}%`,
                          bgcolor: "primary.main",
                        }}
                      />
                      <Box
                        sx={{
                          height: "100%",
                          width: `${headToHeadStats[1].currentMatchUpAndStageWinRate}%`,
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
                        {headToHeadStats[0].currentMatchUpAndStageWinRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {headToHeadStats[1].currentMatchUpAndStageWinRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
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
