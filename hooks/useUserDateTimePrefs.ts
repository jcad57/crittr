import { useProfileQuery } from "@/hooks/queries";
import {
  dateDisplayFromProfile,
  timeDisplayFromProfile,
  type UserDateDisplay,
  type UserTimeDisplay,
} from "@/utils/userDateTimeFormat";
import { useMemo } from "react";

export type UserDateTimePrefs = {
  timeDisplay: UserTimeDisplay;
  dateDisplay: UserDateDisplay;
};

/**
 * Date/time formatting from the logged-in user's profile (`profiles`).
 * Defaults to 12-hour times and MM/DD-style dates until the profile row loads.
 */
export function useUserDateTimePrefs(): UserDateTimePrefs {
  const { data: profile } = useProfileQuery();
  return useMemo(
    () => ({
      timeDisplay: timeDisplayFromProfile(profile),
      dateDisplay: dateDisplayFromProfile(profile),
    }),
    [
      profile?.time_display_format,
      profile?.date_display_format,
    ],
  );
}
