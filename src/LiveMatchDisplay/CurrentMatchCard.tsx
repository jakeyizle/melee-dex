import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  Grid,

} from "@mui/material"

export const CurrentMatchCard = () => {
  return (
    <Card variant="outlined">
    <CardHeader
      title="Current Match"
      subheader="Live match information"
    />
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              mx: "auto",
              bgcolor: "action.hover",
              borderRadius: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
              }}
            >
              🦊
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: "bold" }}>
            Player 1
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fox
          </Typography>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          VS
        </Typography>

        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              mx: "auto",
              bgcolor: "action.hover",
              borderRadius: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
              }}
            >
              🐦
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: "bold" }}>
            Player 2
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Falco
          </Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ fontWeight: "medium" }}>
          Stage: Final Destination
        </Typography>
      </Box>
    </CardContent>
  </Card>
  )
}
