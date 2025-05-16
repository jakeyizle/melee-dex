import { Paper, Typography } from "@mui/material";

interface PaperDisplayProps {
  title: string;
  value: string | number;
}

export const PaperDisplay = ({ title, value }: PaperDisplayProps) => {
  return (
    <Paper sx={{ p: 2, bgcolor: "rgba(99, 102, 241, 0.05)" }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" color="text.primary">
        {value}
      </Typography>
    </Paper>
  );
};
