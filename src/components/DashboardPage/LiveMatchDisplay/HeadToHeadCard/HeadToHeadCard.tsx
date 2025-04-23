import { Typography, Box, Card, CardHeader } from "@mui/material";

import { useReplayStore } from "@/replayStore";
import { HeadToHeadCardContent } from "./HeadToHeadCardContent";
import { HeadToHeadEmptyCardContent } from "./HeadToHeadEmptyCardContent";
import { getCharacterNameFromId } from "@/utils/meleeIdUtils";

export const HeadToHeadCard = () => {
  const { statInfo, currentReplayInfo } = useReplayStore();
  const numberOfGames =
    statInfo?.headToHeadStat.find((stat) => stat.type === "overall")
      ?.totalCount || 0;

  const numberOfGamesText =
    numberOfGames > 0 && statInfo
      ? `${numberOfGames} ${numberOfGames === 1 ? "game" : "games"} played as ${getCharacterNameFromId(statInfo.userInfo.currentCharacterId)}`
      : "";
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
      {currentReplayInfo && statInfo && numberOfGames > 0 ? (
        <HeadToHeadCardContent
          statInfo={statInfo}
          stageId={currentReplayInfo.stageId}
        />
      ) : (
        <HeadToHeadEmptyCardContent />
      )}
    </Card>
  );
};
