/**
 * Data access for `pet_activities` — the timeline row behind every logged event.
 *
 * Split by what the caller is doing rather than by activity type, because the
 * per-type differences are only field mapping while the read, create, edit and
 * weigh-in paths have genuinely different concerns (paging, co-carer push,
 * cross-table writes).
 *
 * Import from `@/services/activities`; the modules below are implementation
 * detail and may be reorganised.
 */

export {
  fetchActivitiesForPet,
  fetchActivitiesForPetOnDay,
  fetchActivitiesSince,
  fetchActivitiesSinceForPetIds,
  fetchActivityById,
  fetchTodayActivities,
  fetchTodayActivitiesForPetIds,
} from "./queries";

export type { LogActivityOptions } from "./log";
export {
  logExercise,
  logFood,
  logMaintenance,
  logMedication,
  logPotty,
  logTraining,
} from "./log";

export {
  deletePetActivity,
  updateExerciseActivity,
  updateFoodActivity,
  updateMaintenanceActivity,
  updateMedicationActivity,
  updatePottyActivity,
  updateTrainingActivity,
  updateVetVisitActivity,
} from "./update";

export { logWeighIn, updateWeighInActivity } from "./weighIn";

export { ensureTodayVetVisitMirrorActivities } from "./vetVisitMirror";
