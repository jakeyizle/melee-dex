import type React from "react";
import {
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  AppBar,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { Link } from "react-router-dom";

const theme = createTheme({
  palette: {
    mode: "dark",
    // primary: {
    //   main: "#6366f1",
    // },
    // secondary: {
    //   main: "#f59e0b",
    // },
  },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
              MeleeDex
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
              {/* <Link
                to="/history"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Match History
                </Typography>
              </Link> */}
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
