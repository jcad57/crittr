import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildDueCareReminders, type CareReminderInput } from "./careReminderPlan.ts";

/** Cursor paging avoids silently dropping pets at the API's default row limit. */
export async function materializeCareReminders(admin: SupabaseClient, now = new Date()) {
  let after: string | null = null;
  let pets = 0, occurrences = 0, failed = 0;
  for (;;) {
    const { data, error } = await admin.rpc("care_reminder_inputs", { p_after: after, p_limit: 100 });
    if (error) throw error;
    const inputs = (data ?? []) as CareReminderInput[];
    for (const input of inputs) {
      try {
        const reminders = buildDueCareReminders(input, now);
        if (reminders.length) {
          const { data: count, error: enqueueError } = await admin.rpc("enqueue_due_care_reminders", {
            p_pet_id: input.pet.id, p_version: input.version, p_reminders: reminders,
          });
          if (enqueueError) throw enqueueError;
          occurrences += Number(count ?? 0);
        }
      } catch (error) {
        failed++;
        console.error("[care-reminders] pet planning failed", input.pet.id, error instanceof Error ? error.message : "Unknown error");
      }
      pets++;
    }
    if (inputs.length < 100) break;
    after = inputs[inputs.length - 1].pet.id;
  }
  return { pets, occurrences, failed };
}
