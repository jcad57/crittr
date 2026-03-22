import { Redirect, Stack } from 'expo-router'

import { useAuth } from '@/context/auth'

/**
 * Authenticated group layout.
 * Guard: if there is no active session, kick the user back to
 * the welcome screen. This makes every route inside (logged-in)
 * protected automatically.
 */
export default function LoggedInLayout() {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
