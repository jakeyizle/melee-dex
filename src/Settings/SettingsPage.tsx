import { useState, useEffect } from "react";
import {
  Typography,
  Container,
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  InputAdornment,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { useNavigate } from "react-router-dom";
import { selectAllSettings, upsertSettings } from "../db/settings";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [replayDirectory, setReplayDirectory] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [directoryErrorText, setDirectoryErrorText] = useState<string>("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { replayDirectory, username } = await selectAllSettings();
      setReplayDirectory(replayDirectory);
      setUsername(username);
    };
    fetchSettings();
  }, []);

  const handleDirectorySelect = async () => {
    const directory = await window.ipcRenderer.invoke("select-directory");
    if (directory) {
      setDirectoryErrorText("");
      setReplayDirectory(directory);
    }
  };

  const handleSaveSettings = () => {
    if (!replayDirectory) {
      setDirectoryErrorText("Please select a replay directory");
      return;
    }
    setReplayDirectory(replayDirectory);
    setUsername(username);
    upsertSettings([
      { key: "replayDirectory", value: replayDirectory },
      { key: "username", value: username },
    ]);
    navigate("/");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Container component="main" sx={{ py: 3, flex: 1 }}>
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
          <Card>
            <CardHeader
              title="App Settings"
              subheader="Configure your Smash Stats Tracker"
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ mb: 3 }}>
                <FormControl
                  fullWidth
                  sx={{ mb: 1 }}
                  error={!!directoryErrorText}
                >
                  <FormLabel required sx={{ mb: 1, fontWeight: 500 }}>
                    Replay Directory
                  </FormLabel>
                  <TextField
                    helperText={directoryErrorText}
                    error={!!directoryErrorText}
                    fullWidth
                    placeholder="Select replay directory..."
                    value={replayDirectory}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<FolderOpenIcon />}
                            onClick={handleDirectorySelect}
                          >
                            Browse
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  Where Slippi stores your replays.
                </Typography>
              </Box>

              <Box>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <FormLabel sx={{ mb: 1, fontWeight: 500 }}>
                    Your Connect Code
                  </FormLabel>
                  <TextField
                    fullWidth
                    placeholder="Enter your Slippi connect code..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  Your connect code helps identify which player is you in the
                  stats (optional)
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveSettings}
              >
                Save Settings
              </Button>
            </CardActions>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};
