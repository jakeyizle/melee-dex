import { Box, CardContent } from "@mui/material";

export const CurrentMatchEmptyCardContent = () => {
  return (
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        No Match History
      </Box>
    </CardContent>
  );
};
