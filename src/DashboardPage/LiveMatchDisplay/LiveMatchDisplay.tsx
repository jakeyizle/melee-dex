import { Container, Grid, Stack } from "@mui/material";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { UserStatsCard } from "./UserStatsCard";
import { RecentMatchesCard } from "./RecentMatchesCard";

export const LiveMatchDisplay = () => {
  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
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
