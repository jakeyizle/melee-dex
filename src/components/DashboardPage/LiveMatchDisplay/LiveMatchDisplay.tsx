import { Container, Grid, Stack } from "@mui/material";
import { useReplayStore } from "@/replayStore";
import { OverallStatsCard } from "@/components/OverallStatsCard";
import { HeadToHeadCard } from "./NewHeadToHeadCard";
import { NoIdentityCard } from "@/components/NoIdentityCard";

export const LiveMatchDisplay = () => {
  const userConnectCode = useReplayStore((state) => state.userConnectCode);

  // A game is on but the app does not know which player is the user, so it
  // cannot say whose record this is. Rule B settles this on its own whenever
  // the library tells the two players apart; when it cannot, asking is the
  // only honest option, and this is the moment the answer matters most.
  if (!userConnectCode) return <NoIdentityCard />;

  return (
    <Container sx={{ flex: 1 }} maxWidth="xl">
      <Grid container spacing={4}>
        <Grid size={{ sm: 12, lg: 6 }}>
          <HeadToHeadCard />
        </Grid>
        <Grid size={{ sm: 12, lg: 6 }}>
          <Stack spacing={4}>
            <OverallStatsCard />
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};
