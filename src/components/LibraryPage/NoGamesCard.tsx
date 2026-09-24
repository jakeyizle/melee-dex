import { Card, CardContent, Box, Typography } from "@mui/material";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

/**
 * The connect code is known and the import finished, but nothing counted —
 * either the library holds no games this player was in, or the code is wrong.
 */
export const NoGamesCard = () => (
  <Card sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
    <CardContent sx={{ p: 4 }}>
      <Box sx={{ textAlign: "center" }}>
        <SportsEsportsIcon
          sx={{ fontSize: 60, color: "primary.main", opacity: 0.8, mb: 2 }}
        />
        <Typography
          variant="h5"
          component="h2"
          sx={{ fontWeight: "bold", mb: 1 }}
        >
          No games yet
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
          }}
        >
          None of the imported replays have you in them. Play a game, or check
          that the connect code in Settings is the one you play under.
        </Typography>
      </Box>
    </CardContent>
  </Card>
);
