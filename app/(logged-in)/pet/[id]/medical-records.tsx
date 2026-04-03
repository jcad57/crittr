import MedicalRecordAddFilesModal, {
  type PendingMedicalFile,
} from "@/components/medical/MedicalRecordAddFilesModal";
import HealthListCard from "@/components/ui/health/HealthListCard";
import HealthSectionHeader from "@/components/ui/health/HealthSectionHeader";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useCreatePetMedicalRecordWithFilesMutation,
  usePetDetailsQuery,
  usePetMedicalRecordsQuery,
  usePetVetVisitsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { defaultTitleFromFileName } from "@/services/petMedicalRecords";
import { useAuthStore } from "@/stores/authStore";
import type {
  PetMedicalRecord,
  PetVaccination,
  PetVetVisit,
} from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function vetKindIcon(kind: "visit" | "vaccination") {
  return kind === "vaccination"
    ? ("needle" as const)
    : ("stethoscope" as const);
}

function formatMediumDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function vaccinationDateLabel(v: PetVaccination): string {
  if (v.expires_on) {
    return `Expires ${new Date(`${v.expires_on}T12:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    )}`;
  }
  return formatMediumDate(v.created_at);
}

function buildVisitSummary(v: PetVetVisit, petName: string): string {
  const parts = [v.location?.trim(), v.notes?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return `Visit for ${petName}`;
}

function buildVaccinationSummary(v: PetVaccination): string {
  if (v.frequency_label?.trim()) return v.frequency_label.trim();
  if (v.notes?.trim()) return v.notes.trim();
  return "Vaccination on file";
}

function recordSubtitle(record: PetMedicalRecord, fileCount: number): string {
  const when = new Date(record.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const fc = fileCount === 1 ? "1 file" : `${fileCount} files`;
  return `${fc} · ${when}`;
}

type VetRow = {
  key: string;
  kind: "visit" | "vaccination";
  title: string;
  dateLabel: string;
  summary: string;
  href: Href;
};

export default function PetMedicalRecordsScreen() {
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { push, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const { data: details, isLoading: loadingPet } = usePetDetailsQuery(petId);
  const { data: vetVisits = [], isLoading: loadingVisits } =
    usePetVetVisitsQuery(petId);
  const {
    data: medicalList,
    isLoading: loadingMedical,
    isError: medicalError,
  } = usePetMedicalRecordsQuery(petId);

  const canManagePetRecords = useCanPerformAction(
    petId,
    "can_manage_pet_records",
  );

  const createMut = useCreatePetMedicalRecordWithFilesMutation(petId ?? "");
  const { runWithProOrUpgrade } = useProGateNavigation();

  const [addOpen, setAddOpen] = useState(false);

  const vetRows: VetRow[] = useMemo(() => {
    if (!details || !petId) return [];
    const name = details.name?.trim() || "your pet";
    const dated: { row: VetRow; t: number }[] = [];

    for (const v of vetVisits) {
      dated.push({
        t: new Date(v.visit_at).getTime(),
        row: {
          key: `visit-${v.id}`,
          kind: "visit",
          title: v.title,
          dateLabel: formatMediumDate(v.visit_at),
          summary: buildVisitSummary(v, name),
          href: `/(logged-in)/pet/${petId}/vet-visits/${v.id}` as Href,
        },
      });
    }

    for (const v of details.vaccinations ?? []) {
      const t = v.expires_on
        ? new Date(`${v.expires_on}T12:00:00`).getTime()
        : new Date(v.created_at).getTime();
      dated.push({
        t,
        row: {
          key: `vac-${v.id}`,
          kind: "vaccination",
          title: v.name,
          dateLabel: vaccinationDateLabel(v),
          summary: buildVaccinationSummary(v),
          href: `/(logged-in)/pet/${petId}/vaccinations/${v.id}` as Href,
        },
      });
    }

    dated.sort((a, b) => b.t - a.t);
    return dated.map((d) => d.row);
  }, [details, vetVisits, petId]);

  const onCreateSubmit = useCallback(
    async (payload: { recordName?: string; pending: PendingMedicalFile[] }) => {
      if (!petId || !userId) return;
      const files = payload.pending.map((p) => ({
        localUri: p.asset.uri,
        originalFilename: p.asset.name,
        mimeType: p.asset.mimeType,
        fileSizeBytes: p.asset.size,
      }));
      const recordTitle =
        payload.recordName?.trim() ||
        defaultTitleFromFileName(files[0]!.originalFilename);
      await createMut.mutateAsync({
        userId,
        recordTitle,
        files,
      });
      setAddOpen(false);
    },
    [createMut, petId, userId],
  );

  if (loadingPet) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Pet not found.</Text>
      </View>
    );
  }

  const showUploadTools = canManagePetRecords === true && Boolean(userId);
  const permLoading = canManagePetRecords === undefined;
  const records = medicalList?.records ?? [];
  const fileCounts = medicalList?.fileCounts ?? new Map<string, number>();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Medical Records
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Medical records for"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Visit notes, vaccinations, and files you&apos;ve saved for{" "}
          {details.name}. Schedule new visits from Health → Upcoming visits.
        </Text>

        {permLoading ? (
          <Text style={styles.hint}>Checking permissions…</Text>
        ) : canManagePetRecords === false ? (
          <Text style={styles.hint}>
            You can view medical files here. Ask the primary caretaker to enable
            &quot;Manage medical files&quot; for you to add or remove uploads.
          </Text>
        ) : null}

        {showUploadTools ? (
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}
            onPress={() => {
              runWithProOrUpgrade(() => setAddOpen(true));
            }}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={Colors.orange}
            />
            <Text style={styles.addBtnText}>Add medical record</Text>
          </Pressable>
        ) : null}

        <HealthSectionHeader title="YOUR UPLOADS" />

        <HealthListCard>
          {loadingMedical ? (
            <View style={styles.paddedCenter}>
              <ActivityIndicator color={Colors.orange} />
            </View>
          ) : medicalError ? (
            <Text style={styles.emptyText}>
              Could not load records. Pull to refresh or try again later.
            </Text>
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>
              {showUploadTools
                ? "No medical records yet. Tap Add medical record to upload PDFs or photos."
                : "No medical records yet."}
            </Text>
          ) : (
            records.map((r, i) => (
              <Pressable
                key={r.id}
                style={[styles.row, i < records.length - 1 && styles.rowBorder]}
                onPress={() =>
                  push(
                    `/(logged-in)/pet/${petId}/medical-records/${r.id}` as Href,
                  )
                }
              >
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name="file-document-multiple-outline"
                    size={22}
                    color={Colors.lavenderDark}
                  />
                </View>
                <View style={styles.mid}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {recordSubtitle(r, fileCounts.get(r.id) ?? 0)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.gray400}
                />
              </Pressable>
            ))
          )}
        </HealthListCard>

        <HealthSectionHeader title="FROM YOUR VET" />
        <HealthListCard>
          {loadingVisits ? (
            <View style={styles.paddedCenter}>
              <ActivityIndicator color={Colors.orange} />
            </View>
          ) : vetRows.length === 0 ? (
            <Text style={styles.emptyText}>
              Coming soon in a future update. You clinic will be able to share
              medical records for your pet directly to your pet's portal for you
              to view!
            </Text>
          ) : (
            vetRows.map((r, i) => (
              <Pressable
                key={r.key}
                style={[styles.row, i < vetRows.length - 1 && styles.rowBorder]}
                onPress={() => push(r.href)}
              >
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name={vetKindIcon(r.kind)}
                    size={20}
                    color={Colors.lavenderDark}
                  />
                </View>
                <View style={styles.mid}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={styles.rowMeta}>{r.dateLabel}</Text>
                  <Text style={styles.rowSummary} numberOfLines={3}>
                    {r.summary}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.gray400}
                />
              </Pressable>
            ))
          )}
        </HealthListCard>
      </ScrollView>

      <MedicalRecordAddFilesModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        mode="create"
        isSubmitting={createMut.isPending}
        onSubmit={async (payload) => {
          try {
            await onCreateSubmit(payload);
          } catch (e) {
            Alert.alert(
              "Could not create record",
              e instanceof Error ? e.message : "Please try again.",
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  notFound: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 19,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lavenderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  rowSummary: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  paddedCenter: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
