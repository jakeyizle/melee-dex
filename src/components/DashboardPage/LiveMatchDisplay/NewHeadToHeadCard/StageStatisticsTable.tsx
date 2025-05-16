import {
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export const StageStatisticsTable = () => {
  const fakeData = [
    {
      stage: "Final Destination",
      games: 10,
      winLoss: "5-5 (50%)",
      sheikSheik: 5,
      sheikSheikWinLoss: "2-3 (32%)",
    },
    {
      stage: "Battlefield",
      games: 10,
      winLoss: "5-5 (50%)",
      sheikSheik: 5,
      sheikSheikWinLoss: "2-3 (32%)",
    },
    {
      stage: "Dreamland",
      games: 10,
      winLoss: "5-5 (50%)",
      sheikSheik: 5,
      sheikSheikWinLoss: "2-3 (32%)",
    },
  ];
  return (
    <TableContainer component={Paper}>
      <Table size="small" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography variant="subtitle1" color="text.secondary">
                Stage
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle1" color="text.secondary">
                Games
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle1" color="text.secondary">
                W/L
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle1" color="text.secondary">
                Sheik-Sheik
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="subtitle1" color="text.secondary">
                W/L
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fakeData.map((row) => (
            <TableRow key={row.stage}>
              <TableCell>{row.stage}</TableCell>
              <TableCell align="right">{row.games}</TableCell>
              <TableCell align="right">{row.winLoss}</TableCell>
              <TableCell align="right">{row.sheikSheik}</TableCell>
              <TableCell align="right">{row.sheikSheikWinLoss}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
