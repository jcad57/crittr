/**
 * Mock medical library per pet — replace with API / Supabase later.
 */

export type MockVetSourcedRecord = {
  id: string;
  title: string;
  dateLabel: string;
  summary: string;
  kind: "visit" | "lab" | "vaccination";
};

export type MockUploadedDocument = {
  id: string;
  fileName: string;
  uploadedLabel: string;
  detail: string;
  fileKind: "pdf" | "image";
};

function hashSeed(petId: string): number {
  return [...petId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function getMockMedicalLibrary(
  petId: string,
  petName: string,
): {
  vetRecords: MockVetSourcedRecord[];
  uploads: MockUploadedDocument[];
} {
  const name = petName.trim() || "Your pet";
  const h = hashSeed(petId);

  const vetRecords: MockVetSourcedRecord[] = [
    {
      id: `${petId}-vr-1`,
      title: "Annual wellness exam",
      dateLabel: "Feb 12, 2026",
      summary: `Dr. Chen · ${name} · weight stable, heart & lungs clear`,
      kind: "visit",
    },
    {
      id: `${petId}-vr-2`,
      title: "Complete blood panel",
      dateLabel: "Feb 12, 2026",
      summary: "Results within normal range · reviewed by clinic",
      kind: "lab",
    },
    {
      id: `${petId}-vr-3`,
      title: "Rabies booster",
      dateLabel: "Aug 3, 2025",
      summary: "Certificate on file · next due 2028",
      kind: "vaccination",
    },
  ];

  if (h % 2 === 1) {
    vetRecords.unshift({
      id: `${petId}-vr-0`,
      title: "Dental cleaning",
      dateLabel: "Nov 8, 2025",
      summary: "Mild tartar removed · no extractions",
      kind: "visit",
    });
  }

  const uploads: MockUploadedDocument[] = [
    {
      id: `${petId}-up-1`,
      fileName: `${name.replace(/\s+/g, "_")}_rabies_certificate.pdf`,
      uploadedLabel: "Uploaded Mar 2, 2026",
      detail: "PDF · 240 KB",
      fileKind: "pdf",
    },
    {
      id: `${petId}-up-2`,
      fileName: "Insurance_card_front.jpg",
      uploadedLabel: "Uploaded Jan 18, 2026",
      detail: "Image · 1.1 MB",
      fileKind: "image",
    },
    {
      id: `${petId}-up-3`,
      fileName: "Allergy_panel_results.pdf",
      uploadedLabel: "Uploaded Dec 4, 2025",
      detail: "PDF · 512 KB",
      fileKind: "pdf",
    },
  ];

  return { vetRecords, uploads };
}
