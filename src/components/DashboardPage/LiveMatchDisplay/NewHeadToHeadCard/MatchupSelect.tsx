import { getCharacterNameFromId } from "@/utils/meleeIdUtils";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

interface MatchupSelectProps {
  label: string;
  availableCharacterIds: string[];
  value: string;
  onChange: (value: string) => void;
}

const options = (availableCharacterIds: string[]) => {
  return availableCharacterIds.map((id) => {
    return (
      <MenuItem key={id} value={id}>
        {getCharacterNameFromId(id)}
      </MenuItem>
    );
  });
};

export const MatchupSelect = ({
  label,
  availableCharacterIds,
  value,
  onChange,
}: MatchupSelectProps) => {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options(availableCharacterIds)}
      </Select>
    </FormControl>
  );
};
