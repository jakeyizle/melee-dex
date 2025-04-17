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
  Divider,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/Warning";
import { useNavigate } from "react-router-dom";
import { selectAllSettings, upsertSettings } from "../db/settings";
import { dropDB } from "@/db/stores";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [replayDirectory, setReplayDirectory] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [directoryErrorText, setDirectoryErrorText] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState(false);

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

  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    setDeleteConfirmText("");
    setDeleteError(false);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.toLowerCase() === "delete") {
      await dropDB();
      setDeleteDialogOpen(false);
      navigate("/");
    } else {
      setDeleteError(true);
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

            <Divider sx={{ mx: 2 }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "error.main" }}>
                Danger Zone
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                    Delete Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This will permanently delete all your replay data and
                    statistics
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteDialogOpen}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Container>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <WarningIcon color="error" />
          Confirm Database Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description" sx={{ mb: 2 }}>
            This action will permanently delete all of your data and you will
            have to re-import everything!
          </DialogContentText>

          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Please type "delete" to confirm
            </Alert>
          )}

          <TextField
            fullWidth
            label="Type 'delete' to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            variant="outlined"
            error={deleteError}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDeleteDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteConfirmText.toLowerCase() !== "delete"}
          >
            Delete Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
