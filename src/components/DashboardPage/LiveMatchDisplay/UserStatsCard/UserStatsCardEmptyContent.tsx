import { CardContent, Box } from "@mui/material";

export const UserStatsCardEmptyContent = () => {
  return (
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        No Stats Found
      </Box>
    </CardContent>
  );
};
