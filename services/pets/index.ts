/**
 * Data access for `pets` and the rows hanging off a pet.
 *
 * Split by lifecycle stage — creation, reading, editing, activation, removal —
 * because that is how the screens divide too, and because creation is an order
 * of magnitude larger than the rest and was swamping the file.
 *
 * Import from `@/services/pets`; the modules below are implementation detail.
 */

export type { CreatePetOptions } from "./createPet";
export { createPet, PetCreatedCoCareInviteFailedError } from "./createPet";

export {
  fetchAccessiblePets,
  fetchPetProfile,
  fetchPetsWithDetails,
  fetchUserPets,
} from "./queries";

export type {
  PetMicrochipUpdate,
  UpdatePetDetailsInput,
  UpdatePetExerciseRequirementsInput,
  UpdatePetInsuranceInput,
  UpdatePetNameAndBreedInput,
} from "./updates";
export {
  updatePetAvatar,
  updatePetDetails,
  updatePetExerciseRequirements,
  updatePetInsurance,
  updatePetMicrochip,
  updatePetNameAndBreed,
} from "./updates";

export {
  ensureOneActivePet,
  repairActivePetSelection,
  setActivePet,
} from "./activePet";

export { deletePet, memorializePet, unmemorializePet } from "./lifecycle";
