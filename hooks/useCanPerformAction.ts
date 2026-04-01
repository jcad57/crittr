import { useUserPetPermissionsQuery } from "@/hooks/queries/useCoCareQuery";
import type { CoCarePermissions } from "@/types/database";

type PermissionKey = keyof CoCarePermissions;

/**
 * Returns whether the current user can perform a given action on a pet.
 * Owners always have full access. Co-carers are checked against their
 * permission set. Returns `undefined` while loading.
 */
export function useCanPerformAction(
  petId: string | null | undefined,
  permission: PermissionKey,
): boolean | undefined {
  const { data, isLoading } = useUserPetPermissionsQuery(petId);

  if (isLoading || !data) return undefined;
  if (data.role === "owner") return true;
  return data.permissions[permission];
}

/**
 * Returns the full role and permissions for the current user on a pet.
 */
export function usePetRole(petId: string | null | undefined) {
  const { data, isLoading } = useUserPetPermissionsQuery(petId);
  return {
    role: data?.role,
    permissions: data?.permissions,
    isLoading,
    isOwner: data?.role === "owner",
    isCoCarer: data?.role === "co_carer",
  };
}
