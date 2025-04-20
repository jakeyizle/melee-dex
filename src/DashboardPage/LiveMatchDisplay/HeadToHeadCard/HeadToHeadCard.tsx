import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Paper,
  Grid,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { useReplayStore } from "@/replayStore";
import { HeadToHeadCardContent } from "./HeadToHeadCardContent";
import { HeadToHeadEmptyCardContent } from "./HeadToHeadEmptyCardContent";

export const HeadToHeadCard = () => {
  const { headToHeadStats, currentReplayInfo } = useReplayStore();
  const numberOfGames =
    headToHeadStats[0].overallWinCount + headToHeadStats[0].overallLossCount;
  const numberOfGamesText =
    numberOfGames === 0
      ? ""
      : `${numberOfGames} ${numberOfGames === 1 ? "game" : "games"} played`;
  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Head-to-Head
            </Typography>
          </Box>
        }
        subheader={numberOfGamesText}
      />
      {currentReplayInfo && headToHeadStats.length > 0 ? (
        <HeadToHeadCardContent
          headToHeadStats={headToHeadStats}
          stageId={currentReplayInfo.stageId}
        />
      ) : (
        <HeadToHeadEmptyCardContent />
      )}
    </Card>
  );
};
