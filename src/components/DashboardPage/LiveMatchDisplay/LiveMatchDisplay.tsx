import { Container, Grid, Stack } from "@mui/material";
import { CurrentMatchCard } from "./CurrentMatchCard";
import { HeadToHeadCard } from "./HeadToHeadCard";
import { UserStatsCard } from "./UserStatsCard";
import { RecentMatchesCard } from "./RecentMatchesCard";
import { HeadToHeadCard as NewHeadToHeadCard } from "./NewHeadToHeadCard";
export const LiveMatchDisplay = () => {
  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={{ sm: 12, lg: 6 }}>
          {/* <CurrentMatchCard /> */}
          <NewHeadToHeadCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 6 }}>
          <Stack spacing={4}>
            <UserStatsCard />
            <RecentMatchesCard />
          </Stack>
        </Grid>
        {/* <Grid size={{ sm: 12, lg: 6 }}>
          <HeadToHeadCard />
        </Grid> */}
        {/* <Grid size={{ sm: 12, lg: 6 }}></Grid> */}
      </Grid>
    </Container>
  );
};
