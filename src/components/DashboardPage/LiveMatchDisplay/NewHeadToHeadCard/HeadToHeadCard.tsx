import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { PlayerAvatar } from "./PlayerAvatar";
import { HeadToHeadScore } from "./HeadToHeadScore";
import { PaperDisplay } from "../PaperDisplay";
import { getTimeString } from "@/utils/displayUtils";
import { GamesPlayedPaperDisplay } from "../GamesPlayedPaperDisplay";
import { CharacterUsagePaper } from "./CharacterUsagePaper";
import { StatsTable } from "./StatsTable";
import { useEffect, useState } from "react";
import { MatchupSelect } from "./MatchupSelect";

const getPercentageString = (percentage: number | undefined) => {
  return percentage !== undefined
    ? Math.round(percentage * 100) / 100 + "%"
    : "-";
};

export const HeadToHeadCard = () => {
  const [userCharacterDisplay, setUserCharacterDisplay] = useState<string>("");
  const [opponentCharacterDisplay, setOpponentCharacterDisplay] =
    useState<string>("");

  const { newStatInfo, headToHeadStats, userConnectCode, currentReplayInfo } =
    useReplayStore();

  useEffect(() => {
    if (currentReplayInfo === null) return;
    const user = currentReplayInfo.players.find(
      (player) => player.connectCode === userConnectCode,
    );

    const opponent = currentReplayInfo.players.find(
      (player) => player.connectCode !== userConnectCode,
    );

    if (!user || !opponent) return;
    setUserCharacterDisplay(user.characterId);
    setOpponentCharacterDisplay(opponent.characterId);
  }, [currentReplayInfo, userConnectCode]);

  if (!headToHeadStats || !currentReplayInfo || !newStatInfo) return null;

  const user = currentReplayInfo.players.find(
    (player) => player.connectCode === userConnectCode,
  );

  const opponent = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  );
  if (!user || !opponent) return null;

  const currentMatchUp = {
    userCharacterId: userCharacterDisplay || user.characterId,
    opponentCharacterId: opponentCharacterDisplay || opponent.characterId,
  };

  const matchupStat = headToHeadStats.opponentStats.matchupStats.find(
    (matchupStat) => {
      return (
        matchupStat.userCharacterId === currentMatchUp.userCharacterId &&
        matchupStat.opponentCharacterId === currentMatchUp.opponentCharacterId
      );
    },
  );

  const matchupStageStats =
    headToHeadStats.opponentStats.matchupAndStageStats.filter(
      (matchupAndStageStat) => {
        return (
          matchupAndStageStat.userCharacterId ===
            currentMatchUp.userCharacterId &&
          matchupAndStageStat.opponentCharacterId ===
            currentMatchUp.opponentCharacterId
        );
      },
    );

  const playerOneColor = "orange";
  const playerTwoColor = "lightblue";
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
              Head to Head
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"start"}>
            <PlayerAvatar
              connectCode={user.connectCode}
              characterId={user.characterId}
              avatarBgColor={playerOneColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"center"}>
            <HeadToHeadScore
              winCount={headToHeadStats.opponentStats.overallStat.winCount}
              winColor={playerOneColor}
              lossCount={headToHeadStats.opponentStats.overallStat.lossCount}
              lossColor={playerTwoColor}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"end"}>
            <PlayerAvatar
              connectCode={opponent.connectCode}
              characterId={opponent.characterId}
              isFlipped
              avatarBgColor={playerTwoColor}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" color="text.primary">
              Overall Stats
            </Typography>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <GamesPlayedPaperDisplay
              stat={headToHeadStats.opponentStats.overallStat}
              playerOneColor={playerOneColor}
              playerTwoColor={playerTwoColor}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="Win Rate"
              value={getPercentageString(
                headToHeadStats.opponentStats.overallStat.winRate,
              )}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="First Match"
              value={getTimeString(
                headToHeadStats.opponentStats.firstMatchDate,
              )}
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <PaperDisplay
              title="Last Match"
              value={getTimeString(headToHeadStats.opponentStats.lastMatchDate)}
            />
          </Grid>

          {headToHeadStats.userCharacterUsages && (
            <Grid size={{ xs: 6 }}>
              <CharacterUsagePaper
                playerConnectCode={user.connectCode}
                characterUsageStats={headToHeadStats.userCharacterUsages}
                color={playerOneColor}
              />
            </Grid>
          )}
          {headToHeadStats.opponentCharacterUsages && (
            <Grid size={{ xs: 6 }}>
              <CharacterUsagePaper
                playerConnectCode={opponent.connectCode}
                characterUsageStats={headToHeadStats.opponentCharacterUsages}
                color={playerTwoColor}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" color="text.primary">
              Matchup Stats
            </Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                {userCharacterDisplay && (
                  <MatchupSelect
                    label={`${user.connectCode} Character`}
                    availableCharacterIds={[
                      ...new Set(
                        headToHeadStats.opponentStats.matchupStats
                          .sort((a, b) => b.totalCount - a.totalCount)
                          .map((matchupStat) => matchupStat.userCharacterId),
                      ),
                    ]}
                    value={userCharacterDisplay}
                    onChange={(characterId) =>
                      setUserCharacterDisplay(characterId)
                    }
                  />
                )}
              </Grid>
              <Grid size={{ xs: 3 }}>
                {opponentCharacterDisplay && (
                  <MatchupSelect
                    label={`${opponent.connectCode} Character`}
                    availableCharacterIds={[
                      ...new Set(
                        headToHeadStats.opponentStats.matchupStats
                          .sort((a, b) => b.totalCount - a.totalCount)
                          .map(
                            (matchupStat) => matchupStat.opponentCharacterId,
                          ),
                      ),
                    ]}
                    value={opponentCharacterDisplay}
                    onChange={(characterId) =>
                      setOpponentCharacterDisplay(characterId)
                    }
                  />
                )}
              </Grid>
            </Grid>
          </Grid>
          {matchupStat && (
            <>
              <Grid size={{ xs: 4 }}>
                <GamesPlayedPaperDisplay
                  stat={matchupStat}
                  playerOneColor={playerOneColor}
                  playerTwoColor={playerTwoColor}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <PaperDisplay
                  title="Win Rate"
                  value={getPercentageString(matchupStat.winRate)}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <PaperDisplay
                  title="Matchup Play Rate"
                  value={getPercentageString(
                    (matchupStat.totalCount /
                      headToHeadStats.opponentStats.overallStat.totalCount) *
                      100,
                  )}
                />
              </Grid>
              {/* <Grid size={{ xs: 3 }}>
                <PaperDisplay title="asdasdasd" value={"asd"} />
              </Grid> */}
            </>
          )}

          <Grid size={{ xs: 12 }}>
            <Box display="flex" flexDirection="column">
              <StatsTable
                overallStageStats={headToHeadStats.opponentStats.stageStats}
                matchupStageStats={matchupStageStats}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
