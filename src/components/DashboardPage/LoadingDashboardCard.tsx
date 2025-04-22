import { Card, CardContent, Box, CircularProgress } from "@mui/material";

export const LoadingDashboardCard = () => {
  return (
    <Card sx={{ maxWidth: 800, mx: "auto", mt: 4, height: "100%" }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <CircularProgress />
        </Box>
      </CardContent>
    </Card>
  );
};
