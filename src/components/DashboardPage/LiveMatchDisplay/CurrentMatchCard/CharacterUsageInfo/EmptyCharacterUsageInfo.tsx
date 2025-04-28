import { Grid, Typography } from "@mui/material";

export const EmptyCharacterUsageInfo = () => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="body2" color="text.secondary">
          Character Usage
        </Typography>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Grid>
    </Grid>
  );
};
