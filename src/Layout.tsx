import type React from "react"
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material"
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
} from "@mui/material"
import { Link } from 'react-router-dom';


const theme = createTheme({
  palette: {
    mode: 'dark',
    // primary: {
    //   main: "#6366f1",
    // },
    // secondary: {
    //   main: "#f59e0b",
    // },
  },
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
          {/* <Link to="/" style={{ textDecoration: "none", color: "inherit" }}> */}
          Live Slippi Stats
          {/* </Link> */}
        </Typography>
        <Box sx={{ ml: "auto", display: "flex", gap: 3 }}>
          <Link to="/settings" style={{ textDecoration: "none", color: "inherit" }}>
            <Typography variant="body2" sx={{ fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
              Settings
            </Typography>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
    {children}
          </Box>
        </ThemeProvider>
  )
}
