import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { petsQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { sortPetsByCreatedAt } from "@/lib/petSort";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const RING_SIZE = 36;
const RADIUS = RING_SIZE / 2;

export type PetNavAvatarProps = {
  /**
   * Pet shown in the ring. Use on pet-scoped routes (e.g. edit medication for
   * this pet). When omitted, the global **active** pet from the store is shown.
   */
  displayPet?: Pet | null;
  /**
   * Prefix for accessibility on the avatar, e.g. "Logging activity for" →
   * "Logging activity for Max".
   */
  accessibilityLabelPrefix?: string;
  /** When false, avatar is not tappable (no switch menu). Default true. */
  allowSwitch?: boolean;
};

/**
 * Nav bar pet avatar. Tap opens a centered menu to change the **global active pet**
 * (persisted via `petStore` + Supabase). Safe to use on any screen; pass
 * `displayPet` when the page is about a specific pet but you still want switching.
 */
export default function PetNavAvatar({
  displayPet: displayPetProp,
  accessibilityLabelPrefix = "Active pet",
  allowSwitch = true,
}: PetNavAvatarProps) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const activePetId = usePetStore((s) => s.activePetId);
  const setActivePet = usePetStore((s) => s.setActivePet);

  const { data: allPets } = usePetsQuery();

  const [menuOpen, setMenuOpen] = useState(false);

  const activePet = useMemo(() => {
    if (!activePetId || !allPets?.length) return null;
    return allPets.find((p) => p.id === activePetId) ?? null;
  }, [activePetId, allPets]);

  const displayPet = displayPetProp ?? activePet;

  const selectablePets = useMemo(() => {
    return sortPetsByCreatedAt(
      (allPets ?? []).filter((p) => isPetActiveForDashboard(p)),
    );
  }, [allPets]);

  const canSwitch = allowSwitch && selectablePets.length > 1;

  const openMenu = useCallback(() => {
    if (!canSwitch) return;
    setMenuOpen(true);
  }, [canSwitch]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const selectPet = useCallback(
    (id: string) => {
      if (id === activePetId) {
        closeMenu();
        return;
      }
      setActivePet(id);
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: petsQueryKey(userId),
        });
      }
      closeMenu();
    },
    [activePetId, setActivePet, userId, closeMenu],
  );

  const a11yLabel = useMemo(() => {
    const name = displayPet?.name?.trim() || "pet";
    const base = `${accessibilityLabelPrefix} ${name}`.trim();
    if (canSwitch) {
      return `${base}. Double tap to switch active pet.`;
    }
    return base;
  }, [accessibilityLabelPrefix, displayPet?.name, canSwitch]);

  if (!displayPet) {
    return <View style={styles.slot} />;
  }

  const ringContent = (
    <View style={styles.avatarShell}>
      <View
        style={[
          styles.ring,
          displayPet.is_memorialized && styles.ringMemorial,
        ]}
      >
        {displayPet.avatar_url?.trim() ? (
          <Image
            source={{ uri: displayPet.avatar_url.trim() }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <MaterialCommunityIcons
            name="paw"
            size={20}
            color={
              displayPet.is_memorialized
                ? Colors.memorialGoldSoft
                : Colors.orange
            }
          />
        )}
      </View>
      {canSwitch ? (
        <View style={styles.switchHintBadge} pointerEvents="none">
          <MaterialCommunityIcons
            name="cached"
            size={11}
            color={Colors.orange}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.slot}>
      {canSwitch ? (
        <Pressable
          onPress={openMenu}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
        >
          {ringContent}
        </Pressable>
      ) : (
        <View accessibilityRole="image" accessibilityLabel={a11yLabel}>
          {ringContent}
        </View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Switch active pet</Text>
            <Text style={styles.modalHint}>
              Home, dashboard, and “log activity” use this pet until you change
              it again.
            </Text>
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selectablePets.map((p) => {
                const isActive = p.id === activePetId;
                return (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [
                      styles.menuRow,
                      pressed && styles.menuRowPressed,
                    ]}
                    onPress={() => selectPet(p.id)}
                  >
                    <View style={styles.menuRowAvatar}>
                      {p.avatar_url?.trim() ? (
                        <Image
                          source={{ uri: p.avatar_url.trim() }}
                          style={styles.menuRowImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="paw"
                          size={18}
                          color={
                            p.is_memorialized
                              ? Colors.memorialGoldSoft
                              : Colors.orange
                          }
                        />
                      )}
                    </View>
                    <Text style={styles.menuRowName} numberOfLines={1}>
                      {p.name?.trim() || "Pet"}
                    </Text>
                    {isActive ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={22}
                        color={Colors.orange}
                      />
                    ) : (
                      <View style={styles.menuRowCheckPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={closeMenu}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Width/height for the nav slot so titles stay centered next to the back button. */
export const PET_NAV_AVATAR_SLOT_SIZE = RING_SIZE;

const styles = StyleSheet.create({
  slot: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarShell: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: "relative",
  },
  /** Material “cache” icon (`cached` glyph) — tap hint when multiple pets. */
  switchHintBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.orange,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RADIUS,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  ringMemorial: {
    backgroundColor: "rgba(201, 184, 150, 0.2)",
    borderColor: Colors.memorialGoldSoft,
  },
  image: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  modalHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  modalList: {
    maxHeight: 320,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  menuRowPressed: {
    opacity: 0.85,
  },
  menuRowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  menuRowImage: {
    width: 40,
    height: 40,
  },
  menuRowName: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  menuRowCheckPlaceholder: {
    width: 22,
    height: 22,
  },
  modalClose: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCloseText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
