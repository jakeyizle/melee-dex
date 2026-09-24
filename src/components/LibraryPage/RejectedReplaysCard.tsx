import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import { selectBadReplayReasons } from "@/db/replays";
import { useReplayStore } from "@/replayStore";
import type { RejectReason } from "@/replayParsing";

/**
 * Why replays were skipped.
 *
 * The parser works out a precise reason for every rejection and used to throw
 * it away, leaving the user with a bare count and no recourse. Most rejections
 * are correct and uninteresting — a friendly against a CPU, a game quit ten
 * seconds in — and saying so is the point: it turns an alarming number into an
 * explained one.
 */
const REASON_LABELS: Record<RejectReason | "unknown", string> = {
  "not-two-human-players": "Not two human players",
  "missing-settings-or-start-time": "Missing game information",
  "too-short": "Shorter than 30 seconds",
  "no-winner": "Ended without a winner",
  "invalid-replay": "No connect code, character or stage",
  unreadable: "Could not be read",
  unknown: "Skipped by an earlier version",
};

const REASON_NOTES: Partial<Record<RejectReason | "unknown", string>> = {
  "not-two-human-players":
    "Matches against a CPU, and anything that is not singles.",
  "too-short": "Usually a game quit almost immediately.",
  "no-winner": "A draw, or a game that was never finished.",
  unreadable: "A corrupt file, or one that is not a replay.",
  unknown: "Imported before the reason was recorded.",
};

export const RejectedReplaysCard = () => {
  const totalBadReplayCount = useReplayStore(
    (state) => state.totalBadReplayCount,
  );
  const [reasons, setReasons] = useState<
    { reason: RejectReason | "unknown"; count: number }[]
  >([]);

  // Re-read whenever the count changes, which is what an import moves.
  useEffect(() => {
    let cancelled = false;
    selectBadReplayReasons().then((rows) => {
      if (!cancelled) setReasons(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [totalBadReplayCount]);

  if (totalBadReplayCount === 0) return null;

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Skipped Replays
          </Typography>
        }
        subheader={`${totalBadReplayCount} ${
          totalBadReplayCount === 1 ? "file was" : "files were"
        } not imported. Most of these are normal.`}
      />
      <CardContent>
        <Stack spacing={1}>
          {reasons.map(({ reason, count }) => (
            <Box
              key={reason}
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 2,
                px: 2,
                py: 1,
                borderRadius: 1,
                bgcolor: "rgba(99, 102, 241, 0.05)",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", minWidth: 48, textAlign: "right" }}
              >
                {count}
              </Typography>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary",
                  }}
                >
                  {REASON_LABELS[reason] ?? reason}
                </Typography>
                {REASON_NOTES[reason] && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {REASON_NOTES[reason]}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
