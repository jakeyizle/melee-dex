import { useState, useRef, useEffect } from "react"
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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from "@mui/material"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import {useNavigate } from "react-router-dom"
import { getSettings, setSetting } from "../db/settings"


export const SettingsPage = () => {
  const navigate = useNavigate();
  const [replayDirectory, setReplayDirectory] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [directoryErrorText, setDirectoryErrorText] = useState<string>("")
  const [isFastLoad, setIsFastLoad] = useState<boolean>(true);

  useEffect(() => {
    const fetchSettings = async () => {
        const {replayDirectory, username, isFastLoad} = await getSettings();
        setReplayDirectory(replayDirectory);
        setUsername(username);
        setIsFastLoad(isFastLoad === "true");
    }
    fetchSettings();
}, [])

  const handleDirectorySelect = async () => {
    const directory = await window.ipcRenderer.invoke("select-directory");
    if (directory) {
      setDirectoryErrorText("");
      setReplayDirectory(directory);
    }
  }

  const handleSaveSettings = () => {
    if (!replayDirectory) {
      setDirectoryErrorText("Please select a replay directory");
      return;
    }
    setReplayDirectory(replayDirectory);
    setUsername(username);
    setSetting("replayDirectory", replayDirectory);
    setSetting("username", username);
    setSetting("isFastLoad", isFastLoad.toString());
    navigate("/");
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default" }}>
      <Container component="main" sx={{ py: 3, flex: 1 }}>
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
          <Card>
            <CardHeader
              title="App Settings"
              subheader="Configure your Smash Stats Tracker"
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 1 }} error={!!directoryErrorText}>
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

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Your Connect Code</FormLabel>
                  <TextField
                    fullWidth
                    placeholder="Enter your Slippi connect code..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  Your connect code helps identify which player is you in the stats (optional)
                </Typography>
              </Box>

              <Box>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <FormLabel sx={{ mb: 1, fontWeight: 500 }}>Fast Load Replays</FormLabel>
                  <RadioGroup
                    row
                    value={isFastLoad}
                    onChange={(e) => setIsFastLoad(e.target.value === "true")}
                  >
                    <FormControlLabel value={true} control={<Radio />} label="Enabled" />
                    <FormControlLabel value={false} control={<Radio />} label="Disabled" />
                  </RadioGroup>
                  <FormHelperText>Fast Load is significantly faster, but uses a lot of resources</FormHelperText>
                </FormControl>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </CardActions>
          </Card>
        </Box>
      </Container>
    </Box>
  )
}
