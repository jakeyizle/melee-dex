import {
  Card,
  CardContent,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import BadgeIcon from "@mui/icons-material/Badge";
import { useReplayStore } from "@/replayStore";

/**
 * Replays are imported but no connect code identifies the user, so there is no
 * "you" to compute wins and losses against.
 *
 * The app knows perfectly well who the likeliest candidates are — it counted
 * them during the import — but it offers them rather than picking one, because
 * a guess that gets persisted is invisible and never revisited. Starting a game
 * answers this too, and does so without asking.
 */
export const NoIdentityCard = () => {
  const navigate = useNavigate();
  const { userCandidates, confirmUserConnectCode } = useReplayStore();

  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center" }}>
          <BadgeIcon
            sx={{ fontSize: 60, color: "primary.main", opacity: 0.8, mb: 2 }}
          />
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            Which of these is you?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: 3,
            }}
          >
            Your replays are imported, but melee-dex does not know which player
            in them is you, so it cannot work out your record.
          </Typography>
        </Box>

        {userCandidates.length > 0 ? (
          <Stack spacing={1} sx={{ mb: 3 }}>
            {userCandidates.map(({ connectCode, appearances }) => (
              <Button
                key={connectCode}
                variant="outlined"
                size="large"
                onClick={() => confirmUserConnectCode(connectCode)}
                sx={{ justifyContent: "space-between", px: 3 }}
              >
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {connectCode}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {appearances} {appearances === 1 ? "game" : "games"}
                </Typography>
              </Button>
            ))}
          </Stack>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Nothing to go on yet</AlertTitle>
            No imported replay names a player, so there is nobody to offer.
            Enter your connect code in Settings, or start a game — melee-dex
            works out who you are from a game you are actually in.
          </Alert>
        )}

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2,
            }}
          >
            None of these? Your connect code is the <strong>ABCD#123</strong>{" "}
            shown next to your name in the Slippi Launcher.
          </Typography>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/settings")}
          >
            Enter it in Settings
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
