import { supabase } from "@/lib/supabase";

/** Updates the authenticated user's email (may require confirmation via Supabase settings). */
export async function updateAuthEmail(email: string) {
  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
  return data;
}
