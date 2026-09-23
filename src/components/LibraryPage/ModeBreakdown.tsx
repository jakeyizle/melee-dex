import { Card, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { Stats } from "@/types";
import { PaperDisplay } from "@/components/PaperDisplay";
import { getModeStat } from "@/utils/statUtils";

interface ModeBreakdownProps {
  stats: Stats;
}

/**
 * The ranked/unranked split of the whole library.
 *
 * Shown from the start rather than once a ranked game exists: "0 games" is a
 * real answer to "how much ranked have I played", and a panel that appears out
 * of nowhere later is harder to understand than one that was always there.
 */
export const ModeBreakdown = ({ stats }: ModeBreakdownProps) => {
  const unranked = getModeStat(stats, "unranked");
  const ranked = getModeStat(stats, "ranked");

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Ranked and Unranked
          </Typography>
        }
      />
      <CardContent>
        <Grid container spacing={1}>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Unranked Games"
              value={`${unranked.totalCount} (${unranked.winCount} - ${unranked.lossCount})`}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Unranked Win Rate"
              value={`${unranked.winRate}%`}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Ranked Games"
              value={`${ranked.totalCount} (${ranked.winCount} - ${ranked.lossCount})`}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <PaperDisplay
              title="Ranked Win Rate"
              value={`${ranked.winRate}%`}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
