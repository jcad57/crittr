import { useAppRatingPrompt } from "@/hooks/useAppRatingPrompt";

/** Headless: the OS in-app review sheet is the only rating UI. */
export default function AppRatingPromptHost() {
  useAppRatingPrompt();
  return null;
}
