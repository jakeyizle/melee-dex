import { Alert, Container, Grid, Stack } from "@mui/material";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { UserStatsCard } from "./UserStatsCard";
import { PlayedCharactersCard } from "./PlayedCharactersCard";
import { RecentMatchesCard } from "./RecentMatchesCard";
interface LiveMatchDisplayProps {
  replayDirectory: string;
}

export const LiveMatchDisplay = ({
  replayDirectory,
}: LiveMatchDisplayProps) => {
  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      {/* <Grid container rowSpacing={1} columnSpacing={2}> */}
      <Grid container spacing={2}>
        <Grid size={{ sm: 12, lg: 4 }}>
          <CurrentMatchCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 8 }}>
          <Stack spacing={2}>
            <UserStatsCard />
          </Stack>
        </Grid>
        <Grid size={{ sm: 12, lg: 4 }}>
          <RecentMatchesCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 8 }}>
          <HeadToHeadCard />
        </Grid>
      </Grid>
    </Container>
  );
};
