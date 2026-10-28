import { supabase } from "@/lib/supabase";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { parseWebsiteUpgradeIntent } from "@/utils/websiteUpgradeIntent";

/** Fetch server metadata: an already-installed app may have a stale JWT. */
export async function fetchWebsiteUpgradeIntent(userId: string) {
  const generation = sessionGeneration();
  const { data, error } = await supabase.auth.getUser();
  if (generation !== sessionGeneration()) return null;
  if (error) throw error;
  if (data.user?.id !== userId) return null;
  return parseWebsiteUpgradeIntent(data.user.user_metadata);
}

/** Acknowledge the ID rather than clearing intent, so a newer web click survives. */
export async function acknowledgeWebsiteUpgradeIntent(
  userId: string,
  intentId: string,
) {
  const generation = sessionGeneration();
  const { data, error } = await supabase.auth.getSession();
  if (generation !== sessionGeneration() || data.session?.user.id !== userId)
    return false;
  if (error) throw error;
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      upgrade_intent_consumed_id: intentId,
      upgrade_intent_consumed_at: new Date().toISOString(),
    },
  });
  if (generation !== sessionGeneration()) return false;
  if (updateError) throw updateError;
  return true;
}
