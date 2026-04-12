/**
 * Builds a text snapshot of all pets the user can access in Crittr (owned + co-care),
 * with foods, medications, vaccinations, exercise prefs, and recent vet visits.
 * Used as CrittrAI system-prompt context (Edge Function, service role).
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type PetRow = Record<string, unknown>;

const MAX_VET_VISITS_PER_PET = 5;

function str(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function groupByPetId<T extends { pet_id: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const id = r.pet_id;
    const arr = m.get(id) ?? [];
    arr.push(r);
    m.set(id, arr);
  }
  return m;
}

function formatFoods(foods: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  for (const f of foods) {
    const brand = str(f.brand) || "(food)";
    const isTreat = f.is_treat === true;
    const notes = str(f.notes);
    const meals = f.meals_per_day != null ? `; ${str(f.meals_per_day)} meals/day` : "";
    lines.push(
      `  - ${isTreat ? "Treat" : "Food"}: ${brand}${meals}${notes ? ` — ${notes}` : ""}`,
    );
    const portions = (f.pet_food_portions ?? []) as Record<string, unknown>[];
    for (const p of portions) {
      const t = str(p.feed_time);
      const sz = str(p.portion_size);
      const u = str(p.portion_unit);
      lines.push(`    · ${t}: ${sz} ${u}`.trim());
    }
  }
  return lines;
}

function formatMeds(meds: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  for (const m of meds) {
    const name = str(m.name) || "Medication";
    const dosage = str(m.dosage);
    const freq = str(m.frequency);
    const cond = str(m.condition);
    const notes = str(m.notes);
    const dpp = m.doses_per_period != null ? str(m.doses_per_period) : "";
    const dp = str(m.dose_period);
    const sched =
      dpp && dp ? ` (${dpp}× per ${dp})` : dpp ? ` (${dpp} doses)` : "";
    const nextDue = str(m.next_due_date);
    const lastGiven = str(m.last_given_on);
    const bits = [
      dosage,
      freq ? `${freq}${sched}` : sched || "",
      cond ? `for ${cond}` : "",
      lastGiven ? `last given ${lastGiven}` : "",
      nextDue ? `next due ${nextDue}` : "",
      notes,
    ].filter(Boolean);
    lines.push(`  - ${name}${bits.length ? ": " + bits.join("; ") : ""}`);
  }
  return lines;
}

function formatVacs(vacs: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  for (const v of vacs) {
    const name = str(v.name) || "Vaccination";
    const exp = str(v.expires_on);
    const notes = str(v.notes);
    lines.push(
      `  - ${name}${exp ? ` (expires / due: ${exp})` : ""}${notes ? ` — ${notes}` : ""}`,
    );
  }
  return lines;
}

function formatVetVisits(visits: Record<string, unknown>[]): string[] {
  if (visits.length === 0) return [];
  const lines: string[] = ["  Recent vet visits (newest first):"];
  for (const v of visits) {
    const title = str(v.title);
    const at = str(v.visit_at);
    const loc = str(v.location);
    const notes = str(v.notes);
    lines.push(
      `  - ${at}: ${title}${loc ? ` @ ${loc}` : ""}${notes ? ` — ${notes}` : ""}`,
    );
  }
  return lines;
}

function formatExercise(ex: Record<string, unknown> | null): string[] {
  if (!ex) return [];
   const walks = ex.walks_per_day != null ? str(ex.walks_per_day) : "";
  const dur =
    ex.walk_duration_minutes != null ? str(ex.walk_duration_minutes) : "";
  const acts = Array.isArray(ex.activities)
    ? (ex.activities as unknown[]).map(str).filter(Boolean).join(", ")
    : "";
  const bits = [
    walks ? `${walks} walks/day` : "",
    dur ? `${dur} min walk` : "",
    acts ? `activities: ${acts}` : "",
  ].filter(Boolean);
  return bits.length ? [`  Exercise targets: ${bits.join("; ")}`] : [];
}

function formatOnePet(
  access: "owner" | "co_carer",
  p: PetRow,
  foods: Record<string, unknown>[],
  meds: Record<string, unknown>[],
  vacs: Record<string, unknown>[],
  vetVisits: Record<string, unknown>[],
  exercise: Record<string, unknown> | null,
): string {
  const lines: string[] = [];
  const name = str(p.name) || "Unnamed pet";
  const memorial = p.is_memorialized === true;
  const rel =
    access === "owner"
      ? "Primary caregiver (owner)"
      : "Co-carer (shared pet)";
  lines.push(`### ${name}${memorial ? " — memorialized" : ""}`);
  lines.push(`- **Access:** ${rel}`);
  lines.push(`- **Crittr pet id:** ${str(p.id)}`);
  const species = str(p.pet_type) || "unknown";
  const breed = str(p.breed);
  lines.push(
    `- **Species / breed:** ${species}${breed ? ` / ${breed}` : ""}`,
  );
  const sex = str(p.sex);
  const dob = str(p.date_of_birth);
  const age = p.age != null ? str(p.age) : "";
  const ageMo = p.age_months != null ? str(p.age_months) : "";
  const ageBits = [
    dob ? `DOB ${dob}` : "",
    age || ageMo ? `age ~${age}y ${ageMo ? `${ageMo}mo` : ""}`.trim() : "",
  ].filter(Boolean);
  if (ageBits.length) lines.push(`- **Age:** ${ageBits.join("; ")}`);
  const w = p.weight_lbs != null ? str(p.weight_lbs) : "";
  const wu = str(p.weight_unit);
  if (w) lines.push(`- **Weight:** ${w} ${wu || "lbs"}`);
  if (sex) lines.push(`- **Sex:** ${sex}`);
  const color = str(p.color);
  if (color) lines.push(`- **Color / markings:** ${color}`);
  const about = str(p.about);
  if (about) lines.push(`- **About:** ${about}`);
  const allergies = Array.isArray(p.allergies)
    ? (p.allergies as unknown[]).map(str).filter(Boolean)
    : [];
  if (allergies.length) {
    lines.push(`- **Recorded allergies / sensitivities:** ${allergies.join(", ")}`);
  }
  const energy = str(p.energy_level);
  const exPerDay = p.exercises_per_day != null ? str(p.exercises_per_day) : "";
  if (energy || exPerDay) {
    lines.push(
      `- **Energy / exercise (from profile):** ${[energy, exPerDay ? `${exPerDay}/day` : ""].filter(Boolean).join("; ")}`,
    );
  }
  const vetClinic = str(p.primary_vet_clinic);
  const vetAddr = str(p.primary_vet_address);
  const vetName = str(p.primary_vet_name);
  if (vetClinic || vetAddr || vetName) {
    lines.push(
      `- **Primary vet:** ${[vetName, vetClinic, vetAddr].filter(Boolean).join(" — ")}`,
    );
  }
  const chip = p.is_microchipped === true ? str(p.microchip_number) : "";
  if (p.is_microchipped === true) {
    lines.push(`- **Microchipped:** yes${chip ? ` (${chip})` : ""}`);
  } else if (p.is_microchipped === false) {
    lines.push("- **Microchipped:** no");
  }
  const fixed = p.is_sterilized;
  if (fixed === true) lines.push("- **Spayed/neutered:** yes");
  else if (fixed === false) lines.push("- **Spayed/neutered:** no (intact)");
  if (p.is_insured === true) {
    const prov = str(p.insurance_provider);
    const pol = str(p.insurance_policy_number);
    lines.push(
      `- **Insurance:** ${[prov, pol].filter(Boolean).join(" — ") || "yes"}`,
    );
  } else if (p.is_insured === false) {
    lines.push("- **Insurance:** not recorded as insured");
  }

  lines.push("- **Feeding (from Crittr):**");
  if (foods.length === 0) lines.push("  - (none recorded)");
  else lines.push(...formatFoods(foods));

  lines.push("- **Medications (from Crittr; not a prescription — informational only):**");
  if (meds.length === 0) lines.push("  - (none recorded)");
  else lines.push(...formatMeds(meds));

  lines.push("- **Vaccinations (from Crittr):**");
  if (vacs.length === 0) lines.push("  - (none recorded)");
  else lines.push(...formatVacs(vacs));

  lines.push(...formatExercise(exercise));

  if (vetVisits.length > 0) lines.push(...formatVetVisits(vetVisits));

  return lines.join("\n");
}

export async function buildCrittrPetContextForUser(
  admin: SupabaseClient,
  userId: string,
  maxTotalChars: number,
): Promise<string> {
  const header =
    "## Crittr pet profile snapshot\nThe user’s pets in Crittr (owned + co-care). Use names and facts below when they ask about a specific pet. If something isn’t listed, it isn’t in Crittr — say so and suggest adding it or checking with their vet.\n";

  const [{ data: owned, error: ownedErr }, { data: links, error: linksErr }] =
    await Promise.all([
      admin.from("pets").select("*").eq("owner_id", userId),
      admin.from("pet_co_carers").select("pet_id").eq("user_id", userId),
    ]);

  if (ownedErr) {
    console.error("[crittrAiPetContext] owned pets", ownedErr);
  }
  if (linksErr) {
    console.error("[crittrAiPetContext] co-carer links", linksErr);
  }

  if (ownedErr && linksErr) {
    return header + "\n_(Could not load pets from Crittr.)_\n";
  }

  const ownedPets = (owned ?? []) as PetRow[];
  const ownedIds = new Set(ownedPets.map((p) => str(p.id)));

  const coLinkIds = [
    ...new Set(
      (links ?? []).map((l: { pet_id: string }) => l.pet_id).filter(Boolean),
    ),
  ].filter((id) => !ownedIds.has(id));

  let coPets: PetRow[] = [];
  if (coLinkIds.length > 0) {
    const { data: cp, error: coErr } = await admin
      .from("pets")
      .select("*")
      .in("id", coLinkIds);
    if (coErr) console.error("[crittrAiPetContext] co-carer pets", coErr);
    coPets = (cp ?? []) as PetRow[];
  }

  type Entry = { access: "owner" | "co_carer"; row: PetRow };
  const entries: Entry[] = [
    ...ownedPets.map((row) => ({ access: "owner" as const, row })),
    ...coPets.map((row) => ({ access: "co_carer" as const, row })),
  ];

  if (entries.length === 0) {
    return (
      header +
      "\n_No pets are linked to this account yet (no owned pets and no active co-care)._\n"
    );
  }

  const petIds = entries.map((e) => str(e.row.id));

  const [foodsRes, medsRes, vacsRes, exRes, ...visitResults] = await Promise.all([
    admin.from("pet_foods").select("*, pet_food_portions(*)").in("pet_id", petIds),
    admin.from("pet_medications").select("*").in("pet_id", petIds),
    admin.from("pet_vaccinations").select("*").in("pet_id", petIds),
    admin.from("pet_exercises").select("*").in("pet_id", petIds),
    ...petIds.map((pid) =>
      admin
        .from("pet_vet_visits")
        .select("*")
        .eq("pet_id", pid)
        .order("visit_at", { ascending: false })
        .limit(MAX_VET_VISITS_PER_PET),
    ),
  ]);

  if (foodsRes.error) console.error("[crittrAiPetContext] foods", foodsRes.error);
  if (medsRes.error) console.error("[crittrAiPetContext] meds", medsRes.error);
  if (vacsRes.error) console.error("[crittrAiPetContext] vacs", vacsRes.error);
  if (exRes.error) console.error("[crittrAiPetContext] exercise", exRes.error);

  const visitsBy = new Map<string, Record<string, unknown>[]>();
  visitResults.forEach((res, idx) => {
    if (res.error) {
      console.error("[crittrAiPetContext] vet visits", petIds[idx], res.error);
      return;
    }
    visitsBy.set(
      petIds[idx],
      (res.data ?? []) as Record<string, unknown>[],
    );
  });

  const foodsBy = groupByPetId((foodsRes.data ?? []) as { pet_id: string }[]);
  const medsBy = groupByPetId((medsRes.data ?? []) as { pet_id: string }[]);
  const vacsBy = groupByPetId((vacsRes.data ?? []) as { pet_id: string }[]);

  const exerciseByPet = new Map<string, Record<string, unknown>>();
  for (const row of (exRes.data ?? []) as Record<string, unknown>[]) {
    const pid = str(row.pet_id);
    if (pid) exerciseByPet.set(pid, row);
  }

  const sections: string[] = [header];
  for (const { access, row } of entries) {
    const pid = str(row.id);
    const foods = (foodsBy.get(pid) ?? []) as Record<string, unknown>[];
    const meds = (medsBy.get(pid) ?? []) as Record<string, unknown>[];
    const vacs = (vacsBy.get(pid) ?? []) as Record<string, unknown>[];
    const vlist = (visitsBy.get(pid) ?? []) as Record<string, unknown>[];
    const exercise = exerciseByPet.get(pid) ?? null;
    sections.push(
      formatOnePet(access, row, foods, meds, vacs, vlist, exercise),
    );
    sections.push("");
  }

  let out = sections.join("\n").trim();
  if (out.length > maxTotalChars) {
    out = out.slice(0, maxTotalChars - 40) +
      "\n\n…[pet snapshot truncated for length]\n";
  }
  return out;
}
