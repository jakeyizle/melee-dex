import type React from "react";
import {
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  AppBar,
  createTheme,
  ThemeProvider,
  Snackbar,
  IconButton,
  SnackbarContent,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);

  useEffect(() => {
    const handleUpdateReady = () => {
      setShowSnackbar(true);
    };
    window.ipcRenderer.on("update-ready", handleUpdateReady);
    window.ipcRenderer.invoke("check-for-updates");
    return () => {
      window.ipcRenderer.off("update-ready", handleUpdateReady);
    };
  }, []);

  useEffect(() => {
    const getVersion = async () => {
      const version = await window.ipcRenderer.invoke("get-app-version");
      setVersion(version);
    };
    getVersion();
  }, []);

  const title = version ? `MeleeDex v${version}` : "MeleeDex";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        <Snackbar
          open={showSnackbar}
          autoHideDuration={6000}
          onClose={() => setShowSnackbar(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          message={
            "An update has been downloaded and will be installed when you close the app."
          }
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setShowSnackbar(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
              {title}
            </Typography>
            <Box sx={{ ml: "auto", display: "flex", gap: 3 }}>
              <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Dashboard
                </Typography>
              </Link>
              <Link
                to="/settings"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Settings
                </Typography>
              </Link>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
          }}
        >
          <Toolbar />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
