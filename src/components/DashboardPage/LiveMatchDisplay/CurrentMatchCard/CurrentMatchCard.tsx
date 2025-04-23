import { Typography, Box, Card, CardHeader } from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { CurrentMatchCardContent } from "./CurrentMatchCardContent";
import { CurrentMatchEmptyCardContent } from "./CurrentMatchEmptyCardContent";

export const CurrentMatchCard = () => {
  const { currentReplayInfo, statInfo } = useReplayStore();
  return (
    <Card
      sx={{
        height: "100%",
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Current Match
            </Typography>
          </Box>
        }
      />
      {currentReplayInfo ? (
        <CurrentMatchCardContent
          currentReplayInfo={currentReplayInfo}
          statInfo={statInfo}
        />
      ) : (
        <CurrentMatchEmptyCardContent />
      )}
    </Card>
  );
};
