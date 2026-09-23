import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { error: Error | null };

/**
 * The renderer is the whole app — an uncaught render error takes the window
 * down with nothing on screen and no way back. This keeps the shell alive and
 * offers Settings, which is where every recoverable cause (a wrong connect
 * code, a moved replay directory) is fixed.
 *
 * Must be a class: React has no hook equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  private handleGoToSettings = () => {
    // A full reload, not a route change: the boundary is above the router and
    // the offending component tree has to be rebuilt from scratch.
    window.location.hash = "#/settings";
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: "auto" }}>
        <Alert severity="error">
          <AlertTitle>Something went wrong</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            melee-dex hit an error while drawing this screen. Your replays are
            still stored — checking your connect code and replay directory in
            Settings is the usual fix.
          </Typography>
          <Typography
            variant="caption"
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              opacity: 0.8,
              mb: 2,
            }}
          >
            {error.message}
          </Typography>
          <Button variant="contained" onClick={this.handleGoToSettings}>
            Go to Settings
          </Button>
        </Alert>
      </Box>
    );
  }
}
