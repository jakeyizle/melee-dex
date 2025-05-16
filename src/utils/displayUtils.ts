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
