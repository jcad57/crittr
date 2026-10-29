import { useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { FREE_PET_LIMIT } from "@/constants/tierLimits";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";

/** Fetch current usage before allowing a flow; database triggers enforce races. */
export function useTierLimitGate() {
  const { runWithProOrUpgrade } = useProGateNavigation();

  const canAddPetOrUpgrade = useCallback(async (
    allowed: () => void,
    onDenied?: () => void,
  ): Promise<boolean> => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (!uid) return false;
    const { count, error } = await supabase.from("pets")
      .select("id", { count: "exact", head: true }).eq("owner_id", uid);
    if (error || count == null) {
      Alert.alert("Could not check pet limit", "Check your connection and try again.");
      return false;
    }
    if (useAuthStore.getState().session?.user?.id !== uid) return false;
    if (count < FREE_PET_LIMIT) {
      allowed();
      return true;
    }
    return runWithProOrUpgrade(allowed, onDenied);
  }, [runWithProOrUpgrade]);

  const canInviteCoCarerOrUpgrade = useCallback(async (
    petId: string,
    allowed: () => void,
    onDenied?: () => void,
  ): Promise<boolean> => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (!uid) return false;
    const { data, error } = await supabase.rpc("can_invite_co_carer", { p_pet_id: petId });
    if (error) {
      Alert.alert("Could not check co-care limit", "Check your connection and try again.");
      return false;
    }
    if (useAuthStore.getState().session?.user?.id !== uid) return false;
    if (data === true) {
      allowed();
      return true;
    }
    return runWithProOrUpgrade(allowed, onDenied);
  }, [runWithProOrUpgrade]);

  return { canAddPetOrUpgrade, canInviteCoCarerOrUpgrade };
}
