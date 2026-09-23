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
import { selectAllSettings, upsertSettings } from "../../db/settings";
import { dropDB } from "@/db/stores";
import { useReplayStore } from "@/replayStore";

/**
 * A Slippi connect code: up to four letters, a hash, then digits. Anything else
 * matches no player, and the stats come back empty with nothing to explain it.
 */
const CONNECT_CODE_PATTERN = /^[A-Za-z]{1,4}#\d{1,6}$/;

export const SettingsPage = () => {
  const navigate = useNavigate();
  const confirmUserConnectCode = useReplayStore(
    (state) => state.confirmUserConnectCode,
  );
  const clearLibrary = useReplayStore((state) => state.clearLibrary);
  const [replayDirectory, setReplayDirectory] = useState<string>("");
  /** What was configured when this page opened, to tell a change from a re-save. */
  const [originalDirectory, setOriginalDirectory] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [directoryErrorText, setDirectoryErrorText] = useState<string>("");
  const [connectCodeErrorText, setConnectCodeErrorText] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { replayDirectory, username } = await selectAllSettings();
      setReplayDirectory(replayDirectory);
      setOriginalDirectory(replayDirectory);
      setUsername(username);
    };
    fetchSettings();
  }, []);

  const handleDirectorySelect = async () => {
    const directory = await window.ipcRenderer.invoke("select-directory");
    if (directory) {
      setDirectoryErrorText("");
      setReplayDirectory(directory);
      upsertSettings([{ key: "replayDirectory", value: directory }]);
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

  const handleConnectCodeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setUsername(event.target.value);
    setConnectCodeErrorText("");
  };

  /**
   * The connect code is committed on blur and on save, never per keystroke.
   * Writing every keystroke stored half-typed codes like "AB", which then
   * matched no player, leaving an empty-but-present FullStats behind it.
   *
   * It goes through the store rather than straight to settings so the stats are
   * rebuilt against the new code right away; otherwise entering it here did
   * nothing visible until the next launch.
   */
  const commitConnectCode = () => {
    const trimmed = username.trim();
    // Empty is allowed: a live game can settle the identity on its own.
    if (trimmed && !CONNECT_CODE_PATTERN.test(trimmed)) {
      setConnectCodeErrorText(
        "That does not look like a connect code. It should be like ABCD#123.",
      );
      return false;
    }
    setConnectCodeErrorText("");
    if (trimmed) confirmUserConnectCode(trimmed);
    return true;
  };

  const handleSaveSettings = async () => {
    if (!replayDirectory) {
      setDirectoryErrorText("Please select a replay directory");
      return;
    }
    if (!commitConnectCode()) return;

    // A different directory is a different library. The stored replays describe
    // games found under the old one, and keeping them would fold two libraries
    // into one set of statistics with no way to tell which games came from
    // where. Navigating back re-imports from the new directory.
    if (originalDirectory && originalDirectory !== replayDirectory) {
      await clearLibrary();
      setOriginalDirectory(replayDirectory);
    }

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
              subheader="Configure your MeleeDex settings"
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
                    onChange={handleConnectCodeChange}
                    onBlur={commitConnectCode}
                    error={!!connectCodeErrorText}
                    helperText={connectCodeErrorText}
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

            <Divider sx={{ mx: 2, my: 2 }} />
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
