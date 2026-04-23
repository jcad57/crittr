import MedicalRecordAddFilesModal, {
  type PendingMedicalFile,
} from "@/components/medical/MedicalRecordAddFilesModal";
import ScanRecordPromptSheet from "@/components/medical/ScanRecordPromptSheet";
import ScanRecordReviewSheet from "@/components/medical/ScanRecordReviewSheet";
import MedicalRecordsUploadsList from "@/components/petScreens/medicalRecords/MedicalRecordsUploadsList";
import MedicalRecordsVetList, {
  type VetRow,
} from "@/components/petScreens/medicalRecords/MedicalRecordsVetList";
import HealthSectionHeader from "@/components/ui/health/HealthSectionHeader";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import {
  useApplyMedicalRecordScanMutation,
  useParseMedicalRecordMutation,
} from "@/hooks/mutations/useMedicalRecordScanMutations";
import {
  useCreatePetMedicalRecordWithFilesMutation,
  usePetDetailsQuery,
  usePetMedicalRecordsQuery,
  usePetVetVisitsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { defaultTitleFromFileName } from "@/services/petMedicalRecords";
import type { ParseMedicalRecordResult } from "@/services/medicalRecordParser";
import { useAuthStore } from "@/stores/authStore";
import { buildVisitSummary, formatMediumDate } from "@/utils/medicalRecordsListFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/medical-records.styles";

/**
 * Temporarily disable “Scan with Crittr AI” after creating a record. When `false`, a
 * successful create uploads files and navigates straight to the record detail screen.
 * Set to `true` to restore the scan prompt + review flow (edge function must be deployed).
 */
const ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN = false;

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
  /** Either permission is enough to make the scan worthwhile. Both gate the RLS-protected
   *  inserts/updates that the review sheet will run; if neither is granted we don't offer the
   *  prompt at all (scan would succeed but every decision would then hit an RLS error). */
  const canManageMedications = useCanPerformAction(
    petId,
    "can_manage_medications",
  );
  const canManageVaccinations = useCanPerformAction(
    petId,
    "can_manage_vaccinations",
  );
  const canApplyScanResults =
    canManageMedications === true || canManageVaccinations === true;

  const createMut = useCreatePetMedicalRecordWithFilesMutation(petId ?? "");
  const parseMut = useParseMedicalRecordMutation();
  const applyScanMut = useApplyMedicalRecordScanMutation(petId ?? "");
  const { runWithProOrUpgrade } = useProGateNavigation();

  const [addOpen, setAddOpen] = useState(false);
  /** Set on successful create; applied in `onFullyDismissed` so the scan sheet opens after the add modal unmounts (iOS modal stacking). */
  const scanPromptRecordIdRef = useRef<string | null>(null);
  /** Record id waiting on the user's "scan this?" decision. Cleared when they accept/decline. */
  const [pendingScanRecordId, setPendingScanRecordId] = useState<string | null>(
    null,
  );
  const [scanResult, setScanResult] = useState<ParseMedicalRecordResult | null>(
    null,
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  /**
   * Holds a successful parse result while the prompt sheet plays its close
   * animation. We only flip `reviewOpen` true once the prompt sheet has fully
   * unmounted — stacking two RN `Modal`s on iOS while one is dismissing
   * silently fails to present the second and locks touch input.
   */
  const pendingReviewResultRef = useRef<ParseMedicalRecordResult | null>(null);

  const onAddModalFullyDismissed = useCallback(() => {
    const id = scanPromptRecordIdRef.current;
    scanPromptRecordIdRef.current = null;
    if (id) setPendingScanRecordId(id);
  }, []);

  const onScanPromptFullyDismissed = useCallback(() => {
    const pending = pendingReviewResultRef.current;
    if (!pending) return;
    pendingReviewResultRef.current = null;
    setScanResult(pending);
    setReviewOpen(true);
  }, []);

  /**
   * "FROM YOUR VET" is reserved for clinic-provided documents (same idea as YOUR UPLOADS,
   * different source) — not yet backed by data. We intentionally do **not** list pet
   * vaccinations here: those live under Health → Vaccinations (including items added via
   * document scan). Vet **visits** you log in the app are surfaced here as quick links;
   * they are not confused with scanned meds/vacs.
   */
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
      const created = await createMut.mutateAsync({
        userId,
        recordTitle,
        files,
      });
      if (ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN) {
        scanPromptRecordIdRef.current =
          canApplyScanResults && created?.id ? created.id : null;
      } else {
        scanPromptRecordIdRef.current = null;
      }
      setAddOpen(false);
      if (
        !ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN &&
        created?.id &&
        petId
      ) {
        push(
          `/(logged-in)/pet/${petId}/medical-records/${created.id}` as Href,
        );
      }
    },
    [createMut, petId, userId, canApplyScanResults, push],
  );

  const handleAcceptScan = useCallback(async () => {
    if (!petId || !pendingScanRecordId) return;
    try {
      const result = await parseMut.mutateAsync({
        petId,
        medicalRecordId: pendingScanRecordId,
      });
      /** Stash the result and close the prompt sheet first. The review sheet is
       *  opened in `onScanPromptFullyDismissed` once the prompt's close
       *  animation finishes so we never have two `Modal`s visible at once. */
      pendingReviewResultRef.current = result;
      setPendingScanRecordId(null);
    } catch (e) {
      pendingReviewResultRef.current = null;
      setPendingScanRecordId(null);
      Alert.alert(
        "Couldn’t scan the document",
        e instanceof Error ? e.message : "Please try again in a moment.",
      );
    }
  }, [petId, pendingScanRecordId, parseMut]);

  const handleConfirmScan = useCallback(
    async (decisions: Parameters<typeof applyScanMut.mutateAsync>[0]) => {
      try {
        const { medsApplied, vacsApplied } =
          await applyScanMut.mutateAsync(decisions);
        setReviewOpen(false);
        setScanResult(null);
        const parts: string[] = [];
        if (medsApplied > 0)
          parts.push(
            `${medsApplied} medication${medsApplied === 1 ? "" : "s"}`,
          );
        if (vacsApplied > 0)
          parts.push(
            `${vacsApplied} vaccination${vacsApplied === 1 ? "" : "s"}`,
          );
        if (parts.length > 0) {
          Alert.alert("Saved", `Added ${parts.join(" and ")} to ${details?.name ?? "your pet"}’s profile.`);
        }
      } catch (e) {
        Alert.alert(
          "Couldn’t save",
          e instanceof Error ? e.message : "Please try again.",
        );
      }
    },
    [applyScanMut, details?.name],
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
          Files you upload appear under Your uploads. Medications and vaccinations you add
          (including from scanned documents) are saved under Health. Schedule visits from
          Health → Upcoming visits.
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
              scanPromptRecordIdRef.current = null;
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

        <MedicalRecordsUploadsList
          loading={loadingMedical}
          error={Boolean(medicalError)}
          records={records}
          fileCounts={fileCounts}
          showUploadTools={showUploadTools}
          petId={petId}
          push={push}
        />

        <HealthSectionHeader title="FROM YOUR VET" />
        <MedicalRecordsVetList
          loading={loadingVisits}
          vetRows={vetRows}
          push={push}
        />
      </ScrollView>

      <MedicalRecordAddFilesModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onFullyDismissed={onAddModalFullyDismissed}
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

      <ScanRecordPromptSheet
        visible={
          ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN &&
          Boolean(pendingScanRecordId)
        }
        onDecline={() => setPendingScanRecordId(null)}
        onAccept={handleAcceptScan}
        isScanning={parseMut.isPending}
        onFullyDismissed={onScanPromptFullyDismissed}
      />

      <ScanRecordReviewSheet
        visible={ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN && reviewOpen}
        result={scanResult}
        petName={details?.name ?? null}
        onCancel={() => {
          setReviewOpen(false);
          setScanResult(null);
        }}
        onConfirm={handleConfirmScan}
        isApplying={applyScanMut.isPending}
      />
    </View>
  );
}
