import { LiveReplayPlayers } from "@/types";
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Container,
  Divider,
  Grid,
  Stack,
} from "@mui/material";
import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { useReplayStore } from "@/replayStore";

export const CurrentMatchCard = () => {
  const { currentReplayInfo, headToHeadStats } = useReplayStore();
  if (!currentReplayInfo) return null;
  const playerOne = currentReplayInfo.players[0];
  const playerTwo = currentReplayInfo.players[1];
  const stageId = currentReplayInfo.stageId;

  return (
    <Card
      sx={{
        mb: 3,
        height: "100%",
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Current Match
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 2,
                  position: "relative",
                  overflow: "hidden",
                  border: "2px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                  }}
                >
                  <img src={getCharacterIcon(playerOne.characterId)} />
                </Box>
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ mt: 1, fontWeight: "bold" }}
              >
                {playerOne.connectCode}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {getCharacterNameFromId(playerOne.characterId)}
              </Typography>
            </Box>

            <Box sx={{ mx: 2, textAlign: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                VS
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getStageNameFromId(stageId)}
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 2,
                  position: "relative",
                  overflow: "hidden",
                  border: "2px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                  }}
                >
                  <img src={getCharacterIcon(playerTwo.characterId)} />
                </Box>
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ mt: 1, fontWeight: "bold" }}
              >
                {playerTwo.connectCode}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {getCharacterNameFromId(playerTwo.characterId)}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Grid container spacing={2}>
              {/* Player 1 Characters */}
              <Grid size={{ xs: 12, sm: 5.5 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: "medium", color: "primary.main" }}
                >
                  {headToHeadStats[0].connectCode}
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
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">
                            {getCharacterNameFromId(char.characterId)} (
                            {char.playCount})
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

              <Grid size={{ xs: 1 }}>
                <Divider orientation="vertical" sx={{ my: 0.5 }} />
              </Grid>

              {/* Player 2 Characters */}
              <Grid size={{ xs: 12, sm: 5.5 }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: "medium", color: "secondary.main" }}
                >
                  {headToHeadStats[1].connectCode}
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
                            {getCharacterNameFromId(char.characterId)} (
                            {char.playCount})
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
        </Stack>
      </CardContent>
    </Card>
  );
};
