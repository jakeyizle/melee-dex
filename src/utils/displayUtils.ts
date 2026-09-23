export const getTimeString = (matchDate: string) => {
  const date = new Date(matchDate);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) {
    return `${Math.floor(diff / 1000)} seconds ago`;
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} minutes ago`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} hours ago`;
  } else {
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      //   hour: "2-digit",
      //   minute: "2-digit",
    });
  }
};

export const getPercentageString = (percentage: number) => {
  return Math.round(percentage * 100) / 100 + "%";
};

/** Melee runs at 60fps, so frames are the game clock. */
const FRAMES_PER_SECOND = 60;

/**
 * A game length as `m:ss`, from the frame count the parser read.
 *
 * Returns "-" for zero: replays stored before `lastFrame` was recorded have
 * none, and "0:00" would read as a real game that lasted no time.
 */
export const getDurationString = (frames: number | null | undefined) => {
  if (!frames || frames <= 0) return "-";
  const totalSeconds = Math.round(frames / FRAMES_PER_SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/**
 * A span of game time in the largest unit that reads naturally — hours once
 * there are any, minutes below that.
 */
export const getPlaytimeString = (frames: number | null | undefined) => {
  if (!frames || frames <= 0) return "-";
  const totalMinutes = Math.round(frames / FRAMES_PER_SECOND / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
};
