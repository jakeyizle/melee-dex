import { Alert, Container, Grid, Stack } from "@mui/material";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { UserStatsCard } from "./UserStatsCard";
interface LiveMatchDisplayProps {
  replayDirectory: string;
}

export const LiveMatchDisplay = ({
  replayDirectory,
}: LiveMatchDisplayProps) => {
  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      <Grid container spacing={2}>
        <Grid size={{ sm: 12, lg: 4 }}>
          <CurrentMatchCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 4 }}>
          <UserStatsCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 4 }}>
          <HeadToHeadCard />
        </Grid>
      </Grid>
    </Container>
  );
};
