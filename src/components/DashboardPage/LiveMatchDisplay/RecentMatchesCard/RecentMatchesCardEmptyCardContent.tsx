import { CardContent, Box } from "@mui/material";

export const RecentMatchesCardEmptyContent = () => {
  return (
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        No Matches Found
      </Box>
    </CardContent>
  );
};
