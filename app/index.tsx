/**
 * Entry point — no UI, just routes to the correct section of the app
 * based on the current auth state. By the time this renders, AppGate
 * has already confirmed that auth loading is complete.
 */

import { Redirect } from "expo-router";

import { useAuth } from "@/context/auth";

export default function Index() {
  const { isLoggedIn } = useAuth();

  return isLoggedIn ? (
    <Redirect href="/(logged-in)/dashboard" />
  ) : (
    <Redirect href="/(auth)/welcome" />
  );
}
