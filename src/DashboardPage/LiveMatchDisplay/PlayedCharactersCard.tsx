import { getCharacterIcon } from "@/assets/characterIcons/getCharacterIcon";
import { useReplayStore } from "@/replayStore";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Divider,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";

export const PlayedCharactersCard = () => {
  const { headToHeadStats } = useReplayStore();
  return (
    <Card sx={{ mb: 3, height: "100%" }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Played Characters
            </Typography>
          </Box>
        }
      />
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
