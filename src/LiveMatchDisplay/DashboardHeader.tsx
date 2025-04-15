import { Typography, Box } from "@mui/material";

export const DashboardHeader = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="h4" component="h2" sx={{ fontWeight: "bold" }}>
        Dashboard
      </Typography>
    </Box>
  );
};
