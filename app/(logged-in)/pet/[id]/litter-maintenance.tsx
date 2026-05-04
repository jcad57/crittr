import { Redirect } from "expo-router";

/** Household goals live at `/(logged-in)/litter-maintenance`. */
export default function LegacyPetLitterMaintenanceRedirect() {
  return <Redirect href="/(logged-in)/litter-maintenance" />;
}
