import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Typography,
} from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { PlayerAvatar } from "./PlayerAvatar";
import { HeadToHeadScore } from "./HeadToHeadScore";
import { PaperDisplay } from "@/components/PaperDisplay";
import { getTimeString } from "@/utils/displayUtils";
import { GamesPlayedPaperDisplay } from "../GamesPlayedPaperDisplay";
import { CharacterUsagePaper } from "./CharacterUsagePaper";
import { RecentGamesList } from "./RecentGamesList";
import {
  getCharacterNameFromId,
  getStageNameFromId,
} from "@/utils/meleeIdUtils";
import { getModeStat } from "@/utils/statUtils";

const PLAYER_ONE_COLOR = "orange";
const PLAYER_TWO_COLOR = "lightblue";

const getPercentageString = (percentage: number | undefined) => {
  return percentage !== undefined
    ? Math.round(percentage * 100) / 100 + "%"
    : "-";
};

const recordString = (stat: { winCount: number; lossCount: number }) =>
  `${stat.winCount} - ${stat.lossCount}`;

/**
 * The live view, in two tiers.
 *
 * Tier 1 — who this is and whether we have played — is drawn from
 * `currentReplayInfo` alone, with the head-to-head record as enrichment. That
 * inversion is the point: the card used to return null when the opponent had no
 * stored history, so the single most useful answer the app can give ("you have
 * never played this person") rendered nothing at all.
 *
 * Tier 2 — the context underneath it — needs history and is simply absent
 * without it.
 */
export const HeadToHeadCard = () => {
  const {
    headToHeadStats,
    userConnectCode,
    currentReplayInfo,
    recentReplays,
    liveRanks,
  } = useReplayStore();

  if (!currentReplayInfo) return null;

  const user = currentReplayInfo.players.find(
    (player) => player.connectCode === userConnectCode,
  );
  const opponent = currentReplayInfo.players.find(
    (player) => player.connectCode !== userConnectCode,
  );
  if (!user || !opponent) return null;

  const opponentStats = headToHeadStats?.opponentStats;

  const matchupStat = opponentStats?.matchupStats.find(
    (stat) =>
      stat.userCharacterId === user.characterId &&
      stat.opponentCharacterId === opponent.characterId,
  );
  const stageStat = opponentStats?.stageStats.find(
    (stat) => stat.stageId === currentReplayInfo.stageId,
  );

  // Names change; the connect code does not. Anything they have played under
  // before that is not the name on screen right now is worth surfacing.
  const previousNames = (opponentStats?.knownNames ?? []).filter(
    (name) => name !== opponent.name,
  );

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Head to Head
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={1}>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"start"}>
            <PlayerAvatar
              connectCode={user.connectCode}
              characterId={user.characterId}
              avatarBgColor={PLAYER_ONE_COLOR}
              rank={liveRanks[user.connectCode]}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"center"}>
            <HeadToHeadScore
              winCount={opponentStats?.overallStat.winCount ?? 0}
              winColor={PLAYER_ONE_COLOR}
              lossCount={opponentStats?.overallStat.lossCount ?? 0}
              lossColor={PLAYER_TWO_COLOR}
            />
          </Grid>
          <Grid size={{ xs: 4 }} display="flex" justifyContent={"end"}>
            <PlayerAvatar
              connectCode={opponent.connectCode}
              characterId={opponent.characterId}
              isFlipped
              avatarBgColor={PLAYER_TWO_COLOR}
              rank={liveRanks[opponent.connectCode]}
            />
          </Grid>

          {!opponentStats ? (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                {opponent.name
                  ? `First time against ${opponent.name} (${opponent.connectCode}).`
                  : `First time against ${opponent.connectCode}.`}
              </Alert>
            </Grid>
          ) : (
            <>
              {previousNames.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                    Also played as {previousNames.join(", ")}.
                  </Alert>
                </Grid>
              )}

              <Grid size={{ xs: 3 }}>
                <GamesPlayedPaperDisplay
                  stat={opponentStats.overallStat}
                  playerOneColor={PLAYER_ONE_COLOR}
                  playerTwoColor={PLAYER_TWO_COLOR}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <PaperDisplay
                  title="Win Rate"
                  value={getPercentageString(opponentStats.overallStat.winRate)}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <PaperDisplay
                  title="First Match"
                  value={getTimeString(opponentStats.firstMatchDate)}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <PaperDisplay
                  title="Last Match"
                  value={getTimeString(opponentStats.lastMatchDate)}
                />
              </Grid>

              <Grid size={{ xs: 6 }}>
                <PaperDisplay
                  title="Unranked"
                  value={recordString(getModeStat(opponentStats, "unranked"))}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <PaperDisplay
                  title="Ranked"
                  value={recordString(getModeStat(opponentStats, "ranked"))}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {headToHeadStats?.userCharacterUsages && (
                <Grid size={{ xs: 6 }}>
                  <CharacterUsagePaper
                    playerConnectCode={user.connectCode}
                    characterUsageStats={headToHeadStats.userCharacterUsages}
                    color={PLAYER_ONE_COLOR}
                  />
                </Grid>
              )}
              {headToHeadStats?.opponentCharacterUsages && (
                <Grid size={{ xs: 6 }}>
                  <CharacterUsagePaper
                    playerConnectCode={opponent.connectCode}
                    characterUsageStats={
                      headToHeadStats.opponentCharacterUsages
                    }
                    color={PLAYER_TWO_COLOR}
                  />
                </Grid>
              )}

              {/* This game's matchup and stage, read at a glance rather than
                  chosen from a dropdown: during a game there is no time to
                  operate a control, and the only matchup that matters is the
                  one on screen. */}
              <Grid size={{ xs: 6 }}>
                <PaperDisplay
                  title={`${getCharacterNameFromId(user.characterId)} vs ${getCharacterNameFromId(opponent.characterId)}`}
                  value={
                    matchupStat
                      ? `${recordString(matchupStat)} (${getPercentageString(matchupStat.winRate)})`
                      : "First time in this matchup"
                  }
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <PaperDisplay
                  title={`On ${getStageNameFromId(currentReplayInfo.stageId)}`}
                  value={
                    stageStat
                      ? `${recordString(stageStat)} (${getPercentageString(stageStat.winRate)})`
                      : "First time on this stage"
                  }
                />
              </Grid>

              {recentReplays.length > 0 && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Typography
                      variant="subtitle1"
                      color="text.primary"
                      sx={{ mt: 1 }}
                    >
                      Recent Games
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <RecentGamesList
                      replays={recentReplays}
                      userConnectCode={userConnectCode}
                      winColor={PLAYER_ONE_COLOR}
                      lossColor={PLAYER_TWO_COLOR}
                    />
                  </Grid>
                </>
              )}
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};
