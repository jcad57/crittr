/**
 * The pet's schedule: the planned day, reconciling it against the profile, and
 * ticking items off.
 *
 * Split along the pipeline rather than by table, because the hard parts are the
 * stages, not the storage: building a plan, deciding when to apply it without
 * overlapping runs, warming it into cache, and mirroring completions into
 * activities.
 *
 * Import from `@/services/schedule`; the modules below are implementation
 * detail. Some of them export more than is re-exported here — those extras are
 * for sibling modules, not for callers outside the folder.
 */

export { fetchScheduleItemsForDay } from "./queries";

export type { EnsureScheduleOptions } from "./reconcile";
export {
  beginScheduleItemToggle,
  endScheduleItemToggle,
  ensureScheduleForDay,
} from "./reconcile";

export {
  prefetchScheduleDay,
  SCHEDULE_STALE_MS,
  warmScheduleForPets,
} from "./warm";

export { resyncScheduleForward } from "./resyncForward";

export { completeScheduleItem, uncompleteScheduleItem } from "./complete";

export {
  syncScheduleItemFromActivity,
  syncScheduleItemsLinkedToActivity,
} from "./activitySync";
