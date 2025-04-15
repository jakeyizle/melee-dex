import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Stack,
} from "@mui/material";

export const RecentMatchesCard = () => {
  return (
    <Card variant="outlined">
      <CardHeader title="Recent Matches" subheader="Last 5 matches played" />
      <CardContent>
        <Stack spacing={2}>
          {[1, 2, 3, 4, 5].map((match) => (
            <Paper
              key={match}
              variant="outlined"
              sx={{
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {match % 2 === 0 ? "🦊" : "🐦"}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {match % 2 === 0 ? "Player 1" : "Player 2"} won
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {match % 2 === 0 ? "Fox vs Falco" : "Falco vs Fox"}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {match} hour{match === 1 ? "" : "s"} ago
              </Typography>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
