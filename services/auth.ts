import { supabase } from "@/lib/supabase";
import { Alert } from "react-native";

export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function signInWithGoogle() {
  Alert.alert(
    "Coming Soon",
    "Google sign-in will be available in a future update. Please use email sign-up for now.",
  );
}
