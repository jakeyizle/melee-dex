import { DashboardHeader } from "./DashboardHeader";
import { SettingsHeader } from "./SettingsHeader";

interface HeaderSelectorProps {
  pathname: string;
}

export function HeaderSelector({ pathname }: HeaderSelectorProps) {
  if (pathname === "/") return <DashboardHeader />;
  if (pathname === "/settings") return <SettingsHeader />;

  return null;
}
