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
      </CardContent>
    </Card>
  );
};
