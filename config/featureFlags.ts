/**
 * Build-time feature toggles. Each one exists to keep working code wired up
 * while a surface is disabled, so re-enabling is a one-line change.
 */

/**
 * When `true`, `PetNavAvatar` shows the multi-pet switcher (tap → choose active
 * pet, optionally `onAfterSwitchPet` route replace). When `false`, the avatar is
 * display-only: pet context comes from the current route, not a global toggle.
 *
 * Flip to `true` once flows consistently support switching active pet from
 * nested screens.
 */
export const PET_NAV_AVATAR_PET_SWITCH_ENABLED = false;

/** Master switch for Free-tier banner and interstitial ads. */
export const ADS_ENABLED = true;
