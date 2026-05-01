/**
 * When `true`, {@link PetNavAvatar} shows the multi-pet switcher (tap → choose active pet,
 * optionally `onAfterSwitchPet` route replace). When `false`, the avatar is display-only:
 * pet context comes from the current route / screen, not a global toggle.
 *
 * Flip to `true` once flows consistently support switching active pet from nested screens.
 */
export const PET_NAV_AVATAR_PET_SWITCH_ENABLED = false;
