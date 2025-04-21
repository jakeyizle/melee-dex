import {
  Card,
  CardContent,
  Box,
  Typography,
  Paper,
  Alert,
  AlertTitle,
} from "@mui/material";
import RadarIcon from "@mui/icons-material/Radar";
import { useState, useEffect } from "react";
import { useReplayStore } from "@/replayStore";

export const ListeningForReplayCard = () => {
  const [listeningDuration, setListeningDuration] = useState(0);
  const { totalReplayCount, totalBadReplayCount } = useReplayStore();
  useEffect(() => {
    const interval = setInterval(() => {
      setListeningDuration((prevDuration) => prevDuration + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatListeningTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
            <RadarIcon
              sx={{
                fontSize: 80,
                color: "primary.main",
                animation: "pulse 2s infinite",
                opacity: 0.8,
              }}
            />
          </Box>

          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Listening for Games
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Waiting for a Melee match to start. The dashboard will update
            automatically when a game is detected.
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: "medium" }}
          >
            Listening for {formatListeningTime(listeningDuration)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 4 }}>
          <Paper
            sx={{
              p: 3,
              width: 200,
              textAlign: "center",
              bgcolor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              {totalReplayCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total replays loaded
            </Typography>
          </Paper>

          <Paper
            sx={{
              p: 3,
              width: 200,
              textAlign: "center",
              bgcolor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              {totalBadReplayCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Replays rejected
            </Typography>
          </Paper>
        </Box>

        <Alert severity="success" sx={{ mb: 4 }}>
          <AlertTitle>Ready to track your next match</AlertTitle>
          Start a game in Slippi, and the dashboard will automatically update
          with live match information.
        </Alert>
      </CardContent>
    </Card>
  );
};
