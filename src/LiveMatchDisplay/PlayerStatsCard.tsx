import {
    Typography,
    Box,
    Card,
    CardHeader,
    CardContent,
    Grid,
    Paper,
    Stack,
  } from "@mui/material"

export const PlayerStatsCard = () => {
    return (
        <Card variant="outlined">
        <CardHeader
          title="Player Stats"
          subheader="Historical performance data"
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Player 1</Typography>
                <Typography variant="body2" color="text.secondary">
                  Seen 42 times
                </Typography>
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Win rate</Typography>
                  <Typography variant="body2">68%</Typography>
                </Box>
                <Box sx={{ mt: 0.5, height: 8, bgcolor: "action.hover", borderRadius: 4, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: "68%", bgcolor: "success.main" }} />
                </Box>
              </Box>
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle2">Player 2</Typography>
                <Typography variant="body2" color="text.secondary">
                  Seen 37 times
                </Typography>
              </Box>
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Win rate</Typography>
                  <Typography variant="body2">52%</Typography>
                </Box>
                <Box sx={{ mt: 0.5, height: 8, bgcolor: "action.hover", borderRadius: 4, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: "52%", bgcolor: "success.main" }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Matchup History
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{xs: 6}}>
                  <Paper sx={{ p: 1, bgcolor: "action.hover" }} variant='outlined'>
                    <Typography variant="body2">Player 1 vs Player 2</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      7 - 3
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs: 6}}>
                  <Paper sx={{ p: 1, bgcolor: "action.hover" }} variant='outlined'>
                    <Typography variant="body2">Fox vs Falco</Typography>
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      12 - 8
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
}