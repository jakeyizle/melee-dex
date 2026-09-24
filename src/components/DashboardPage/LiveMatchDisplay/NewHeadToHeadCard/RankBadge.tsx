import { Chip } from "@mui/material";
import { RankProfile } from "@/types";
import { getRatingString, PENDING_TIER } from "@/utils/rankUtils";

interface RankBadgeProps {
  /** Absent or null whenever the lookup has not landed, or failed. */
  rank: RankProfile | null | undefined;
}

/**
 * Current ranked standing, beside the connect code.
 *
 * Renders nothing without a profile. Rank is the one thing on this card that
 * comes from the network rather than the replay, so it is the one thing that
 * can simply be missing — an unreachable endpoint has to look like no badge,
 * not like a broken card.
 */
export const RankBadge = ({ rank }: RankBadgeProps) => {
  if (!rank) return null;

  // A pending profile has a rating, but it is the season's starting value
  // rather than anything earned. Showing it would read as a real number.
  const label =
    rank.tier === PENDING_TIER
      ? PENDING_TIER
      : `${rank.tier} · ${getRatingString(rank.ratingOrdinal)}`;

  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      sx={{ height: 20, fontSize: "0.7rem" }}
    />
  );
};
