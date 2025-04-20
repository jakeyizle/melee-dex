import {
  Card,
  CardContent,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Divider,
  Grid,
  Paper,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

export const NoReplayDirectoryCard = () => {
  const navigate = useNavigate();
  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <FolderOpenIcon
            sx={{ fontSize: 60, color: "primary.main", opacity: 0.8, mb: 2 }}
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Set Up Your Replay Directory
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            To get started, you need to set up your replay directory where
            Slippi stores replay files.
          </Typography>

          <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
            <AlertTitle>Where do I find my replay directory?</AlertTitle>
            Open the Slippi Launcher and click the gear icon to open up
            Settings. Click the "Replays" menu option and the directory can be
            found under "Root SLP Directory."
          </Alert>

          <Button
            variant="contained"
            size="large"
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/settings")}
            sx={{ px: 4 }}
          >
            Go to Settings
          </Button>
        </Box>

        {/* <Divider sx={{ my: 3 }} /> */}

        {/* <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2 }}>
            What you'll be able to do:
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  height: "100%",
                  bgcolor: "rgba(99, 102, 241, 0.05)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Track Match Stats
                </Typography>
                <Typography variant="body2">
                  See detailed statistics for all your matches, including win
                  rates against specific characters and on different stages.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  height: "100%",
                  bgcolor: "rgba(245, 158, 11, 0.05)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Live Match Analysis
                </Typography>
                <Typography variant="body2">
                  Get real-time information about your current match, including
                  head-to-head records against your opponent.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  height: "100%",
                  bgcolor: "rgba(16, 185, 129, 0.05)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Performance Insights
                </Typography>
                <Typography variant="body2">
                  Discover your strengths and weaknesses with detailed
                  performance breakdowns and character matchup data.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box> */}
      </CardContent>
    </Card>
  );
};
