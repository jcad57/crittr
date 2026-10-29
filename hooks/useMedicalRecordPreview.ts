import { downloadMedicalRecordFileForOpening } from "@/services/petMedicalRecords";
import type { PetMedicalRecordFile } from "@/types/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export function useMedicalRecordPreview(recordId: string | undefined) {
  const [preview, setPreview] = useState<{
    file: PetMedicalRecordFile;
    localUri: string | null;
    loading: boolean;
  } | null>(null);
  const requestRef = useRef(0);

  const close = useCallback(() => {
    ++requestRef.current;
    setPreview(null);
  }, []);

  // A late download must never reopen a dismissed viewer or update another record.
  useEffect(() => {
    close();
    return () => {
      ++requestRef.current;
    };
  }, [recordId, close]);

  const open = useCallback(async (file: PetMedicalRecordFile) => {
    const request = ++requestRef.current;
    setPreview({ file, localUri: null, loading: true });
    try {
      const localUri = await downloadMedicalRecordFileForOpening(file);
      if (request === requestRef.current)
        setPreview({ file, localUri, loading: false });
    } catch (error) {
      if (request !== requestRef.current) return;
      setPreview(null);
      Alert.alert(
        "Could not open file",
        error instanceof Error ? error.message : "Try again in a moment.",
      );
    }
  }, []);

  return { preview, open, close };
}
