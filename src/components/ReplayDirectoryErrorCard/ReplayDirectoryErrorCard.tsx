import {
  Card,
  CardContent,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOffIcon from "@mui/icons-material/FolderOff";
import { useReplayStore } from "@/replayStore";

/**
 * The replay directory is configured but could not be read — usually moved,
 * renamed, or on a drive that is not connected.
 *
 * This used to pass in silence: the load ended, the progress bar came down, and
 * the dashboard showed "Listening for Games" over whatever was already stored.
 * Nothing was being imported and no game could ever be detected, because the
 * watcher is not attached to a directory that does not exist.
 */
export const ReplayDirectoryErrorCard = () => {
  const navigate = useNavigate();
  const { replayDirectoryError, loadReplayDirectory } = useReplayStore();

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <FolderOffIcon
            sx={{ fontSize: 60, color: "error.main", opacity: 0.8, mb: 2 }}
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Your Replay Directory Is Missing
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            melee-dex could not read the folder it was told to watch, so no new
            games are being imported and none will be detected while you play.
          </Typography>

          <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
            <AlertTitle>Could not read this folder</AlertTitle>
            <Typography
              variant="body2"
              component="code"
              sx={{ wordBreak: "break-all" }}
            >
              {replayDirectoryError || "(no folder configured)"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              It may have been moved or renamed, or it may be on a drive that is
              not connected. Your imported replays are untouched.
            </Typography>
          </Alert>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/settings")}
            >
              Choose Another Folder
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadReplayDirectory(replayDirectoryError || "")}
            >
              Try Again
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};
