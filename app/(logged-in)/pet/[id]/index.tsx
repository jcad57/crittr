import CoCarerBanner from "@/components/petScreens/petProfile/CoCarerBanner";
import InfoRow from "@/components/petScreens/petProfile/InfoRow";
import PetProfileNavBar from "@/components/petScreens/petProfile/PetProfileNavBar";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import HealthListCard from "@/components/ui/health/HealthListCard";
import MedicationListRow from "@/components/ui/medication/MedicationListRow";
import PetExerciseRequirementsBlock from "@/components/ui/pet/PetExerciseRequirementsBlock";
import PetFoodProfileCard from "@/components/ui/pet/PetFoodProfileCard";
import PetProfileHero from "@/components/ui/pet/PetProfileHero";
import PetStatChips, {
  type StatChipItem,
} from "@/components/ui/pet/PetStatChips";
import RecordsNavCard, {
  type RecordsNavItem,
} from "@/components/ui/pet/RecordsNavCard";
import VaccinationAttentionRow from "@/components/ui/vaccination/VaccinationAttentionRow";
import { Colors } from "@/constants/colors";
import {
  petDetailsQueryKey,
  petsQueryKey,
  useLeaveCoCare,
  usePetDetailsQuery,
  useTodayActivitiesQuery,
} from "@/hooks/queries";
import { useCanPerformAction, usePetRole } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { vaccinationNeedsAttention } from "@/utils/healthTraffic";
import { formatPetFoodPortionSubline, isTreatFood } from "@/utils/petFood";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updatePetAvatar } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import type { PetVaccination } from "@/types/database";
import {
  buildQuickTags,
  medicationSubline,
  profileSubline,
  toProfile,
} from "@/utils/petProfileMapping";
import {
  buildManageItems,
  buildRecordsItems,
} from "@/utils/petProfileNavItems";
import { formatBirthdayChip } from "@/utils/petDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "@/screen-styles/pet/[id]/index.styles";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PetProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { push, replace, router } = useNavigationCooldown();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const ownerId = useAuthStore((s) => s.session?.user?.id);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();

  const { data: details, isLoading } = usePetDetailsQuery(id);

  const { isOwner, isCoCarer, isLoading: roleLoading } = usePetRole(id);
  const leaveCoCareMut = useLeaveCoCare(id ?? "");
  const canEditProfile = useCanPerformAction(id, "can_edit_pet_profile");
  const canManageFood = useCanPerformAction(id, "can_manage_food");
  const canManageMeds = useCanPerformAction(id, "can_manage_medications");
  const { runWithProOrUpgrade } = useProGateNavigation();

  const sortedFoodsForProfile = useMemo(() => {
    if (!details?.foods) return [];
    return [...details.foods].sort((a, b) => {
      const ta = isTreatFood(a);
      const tb = isTreatFood(b);
      return ta === tb ? 0 : ta ? 1 : -1;
    });
  }, [details?.foods]);

  const attentionVaccinations = useMemo((): PetVaccination[] => {
    if (!details?.vaccinations?.length) return [];
    return details.vaccinations.filter(vaccinationNeedsAttention);
  }, [details?.vaccinations]);

  const { data: todayActivities = [] } = useTodayActivitiesQuery(id);

  const handlePetAvatarPress = useCallback(async () => {
    if (!ownerId || !id) return;
    const uri = await pickAvatarImage();
    if (!uri) return;
    setAvatarUploading(true);
    try {
      await updatePetAvatar(ownerId, id, uri);
      await queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: petsQueryKey(ownerId) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't update photo", msg);
    } finally {
      setAvatarUploading(false);
    }
  }, [ownerId, id]);

  const profile = useMemo(
    () =>
      details
        ? toProfile(details, todayActivities, {
            timeDisplay,
            dateDisplay,
          })
        : null,
    [details, todayActivities, timeDisplay, dateDisplay],
  );

  const handleLeaveCoCare = useCallback(() => {
    if (!id || !profile) return;
    const petName = profile.name?.trim() || "this pet";
    Alert.alert(
      "Remove yourself as co-carer?",
      `You will lose access to ${petName}'s profile and activities for this pet. The primary caretaker can invite you again later if needed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            leaveCoCareMut.mutate(undefined, {
              onSuccess: () => {
                replace("/(logged-in)/dashboard" as Href);
              },
              onError: (e) =>
                Alert.alert(
                  "Could not leave",
                  e instanceof Error ? e.message : "Something went wrong.",
                ),
            }),
        },
      ],
    );
  }, [id, profile, leaveCoCareMut, replace]);

  const statItems = useMemo((): StatChipItem[] => {
    if (!profile) return [];
    const birthday = formatBirthdayChip(profile.dateOfBirth);
    const gender = profile.sex === "female" ? "Female" : "Male";
    return [
      {
        label: "Weight",
        value: profile.weightDisplay,
        icon: "scale-bathroom",
        accessibilityLabel: `Weight ${profile.weightDisplay}, view weight history`,
        onPress: () =>
          push(`/(logged-in)/pet/${profile.id}/weight-history` as Href),
      },
      {
        label: "Birthday",
        value: birthday,
        icon: "calendar-month-outline",
      },
      {
        label: "Gender",
        value: gender,
        icon: "gender-male-female",
      },
    ];
  }, [profile, push]);

  const recordsItems = useMemo((): RecordsNavItem[] => {
    if (!profile) return [];
    return buildRecordsItems(profile, push);
  }, [profile, push]);

  const manageItems = useMemo((): RecordsNavItem[] => {
    if (!profile) return [];
    return buildManageItems(profile, {
      roleLoading,
      isOwner,
      isCoCarer,
      push,
      runWithProOrUpgrade,
      handleLeaveCoCare,
    });
  }, [
    profile,
    push,
    isOwner,
    isCoCarer,
    roleLoading,
    handleLeaveCoCare,
    runWithProOrUpgrade,
  ]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Pet not found.</Text>
      </View>
    );
  }

  const tags = buildQuickTags(profile);

  return (
    <View style={styles.screen}>
      <PetProfileNavBar title={profile.name} onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {isCoCarer && <CoCarerBanner />}

        <PetProfileHero
          name={profile.name}
          subline={profileSubline(profile)}
          imageUrl={profile.imageUrl}
          tags={tags}
          onAvatarPress={canEditProfile ? handlePetAvatarPress : undefined}
          avatarUploading={avatarUploading}
          onEditNamePress={
            canEditProfile
              ? () =>
                  push(`/(logged-in)/pet/${profile.id}/edit-name-breed` as Href)
              : undefined
          }
        />

        <PetStatChips items={statItems} />

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Details</SectionLabel>
          {canEditProfile && (
            <Pressable
              hitSlop={8}
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/edit-details` as Href)
              }
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.detailsCard}>
          <InfoRow label="Breed" value={profile.breed} />
          <InfoRow label="Color" value={profile.color} />
          <InfoRow
            label="Vet clinic"
            value={profile.primaryVetClinic?.trim() || "—"}
          />
          <InfoRow
            label="Vet address"
            value={profile.primaryVetAddress?.trim() || "—"}
            isLast
          />
        </View>

        {details ? (
          <PetExerciseRequirementsBlock
            details={details}
            canEdit={canEditProfile === true}
          />
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>Food</SectionLabel>
          {canManageFood && (
            <Pressable
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/food` as Href)
              }
              hitSlop={8}
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
        </View>
        {sortedFoodsForProfile.length > 0 ? (
          <View style={styles.medList}>
            {sortedFoodsForProfile.map((f) => (
              <TouchableOpacity
                key={f.id}
                activeOpacity={0.85}
                onPress={() =>
                  push(`/(logged-in)/pet/${profile.id}/food/${f.id}` as Href)
                }
              >
                <PetFoodProfileCard
                  name={f.brand?.trim() || "Food"}
                  subline={formatPetFoodPortionSubline(f, timeDisplay)}
                  isTreat={isTreatFood(f)}
                  petType={profile.petType ?? null}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyMed}>No foods recorded.</Text>
        )}

        <View style={styles.sectionHeaderRow}>
          <SectionLabel style={styles.sectionLabelInline}>
            Active medications
          </SectionLabel>
          {canManageMeds && (
            <Pressable
              onPress={() =>
                push(`/(logged-in)/pet/${profile.id}/medications` as Href)
              }
              hitSlop={8}
            >
              <Text style={styles.sectionEditLink}>Edit</Text>
            </Pressable>
          )}
        </View>
        {profile.medications.length > 0 ? (
          <HealthListCard>
            {profile.medications.map((m, i) => (
              <MedicationListRow
                key={m.id}
                title={m.name}
                subline={medicationSubline(m)}
                badgeKind={m.badgeKind}
                badgeLabel={m.badgeLabel}
                isLast={i === profile.medications.length - 1}
                onPress={() =>
                  push(
                    `/(logged-in)/pet/${profile.id}/medications/${m.id}` as Href,
                  )
                }
              />
            ))}
          </HealthListCard>
        ) : (
          <Text style={styles.emptyMed}>No medications recorded.</Text>
        )}

        {attentionVaccinations.length > 0 ? (
          <>
            <SectionLabel style={styles.sectionLabelInline}>
              Vaccinations
            </SectionLabel>
            <HealthListCard>
              {attentionVaccinations.map((v, i) => (
                <VaccinationAttentionRow
                  key={v.id}
                  vaccination={v}
                  isLast={i === attentionVaccinations.length - 1}
                  onPress={() => push("/(logged-in)/health" as Href)}
                />
              ))}
            </HealthListCard>
          </>
        ) : null}

        <SectionLabel style={styles.sectionFlush}>Records</SectionLabel>
        <RecordsNavCard items={recordsItems} />

        {manageItems.length > 0 ? (
          <>
            <SectionLabel style={styles.sectionFlush}>Manage pet</SectionLabel>
            <RecordsNavCard items={manageItems} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
