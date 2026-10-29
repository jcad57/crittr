const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const files = loadTS("utils/medicalRecordFiles.ts");

function fixture() {
  const records = new Map(),
    attachments = new Map(),
    objects = new Set();
  const calls = [],
    deleted = [];
  let sequence = 0;
  const state = {
    size: 42,
    failFile: null,
    insertResponseLost: false,
    recordResponseLost: false,
    metadataDenied: false,
    downloadStatus: 200,
    generation: 0,
    duringDownload: () => {},
  };
  const id = () =>
    `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const query = (table) => {
    const rows = table === "pet_medical_records" ? records : attachments;
    let operation = "select",
      payload,
      columns,
      filters = [];
    const execute = async (single) => {
      let data = [...rows.values()].filter((row) =>
        filters.every(([key, value]) => row[key] === value),
      );
      if (operation === "insert") {
        if (state.metadataDenied && table === "pet_medical_record_files")
          return { error: Error("metadata rejected") };
        const row = {
          id: id(),
          created_at: "2026-10-28T12:00:00Z",
          ...payload,
        };
        rows.set(row.id, row);
        data = [row];
        if (
          (table === "pet_medical_record_files" && state.insertResponseLost) ||
          (table === "pet_medical_records" && state.recordResponseLost)
        ) {
          state.insertResponseLost = state.recordResponseLost = false;
          return { error: Error("response lost") };
        }
      } else if (operation === "delete") {
        calls.push(`delete:${table}`);
        data.forEach((row) => rows.delete(row.id));
      } else if (operation === "update") {
        data.forEach((row) => Object.assign(row, payload));
      } else if (columns?.includes("pet_medical_record_files(count)")) {
        data = data.map((row) => ({
          ...row,
          pet_medical_record_files: [
            {
              count: [...attachments.values()].filter(
                (file) => file.medical_record_id === row.id,
              ).length,
            },
          ],
        }));
      } else if (columns?.includes("pet_medical_record_files(*)")) {
        data = data.map((row) => ({
          ...row,
          pet_medical_record_files: [...attachments.values()].filter(
            (file) => file.medical_record_id === row.id,
          ),
        }));
      }
      return { data: single ? (data[0] ?? null) : data, error: null };
    };
    const q = {
      select: (value) => {
        columns = value;
        return q;
      },
      eq: (key, value) => {
        filters.push([key, value]);
        return q;
      },
      order: () => q,
      insert: (value) => {
        payload = value;
        operation = "insert";
        return q;
      },
      update: (value) => {
        payload = value;
        operation = "update";
        return q;
      },
      delete: () => {
        operation = "delete";
        return q;
      },
      single: () => execute(true),
      maybeSingle: () => execute(true),
      then: (resolve, reject) => execute(false).then(resolve, reject),
    };
    calls.push(`query:${table}`);
    return q;
  };
  const fs = {
    cacheDirectory: "file:///cache/",
    getInfoAsync: async () => ({ exists: true, size: state.size }),
    makeDirectoryAsync: async () => {},
    deleteAsync: async (uri) => {
      deleted.push(uri);
    },
    readAsStringAsync: async () => JSON.stringify({ message: "Access denied" }),
    FileSystemUploadType: { BINARY_CONTENT: 0 },
    FileSystemSessionType: { FOREGROUND: 0 },
    createUploadTask: (url, uri, options) => ({
      uploadAsync: async () => {
        calls.push(`upload:${uri}`);
        assert.equal(options.sessionType, 0);
        if (uri === state.failFile) throw Error("network offline");
        objects.add(url);
        return { status: 200 };
      },
      cancelAsync: async () => {},
    }),
    createDownloadResumable: (url, dest, options) => ({
      downloadAsync: async () => {
        calls.push(`download:${url}`);
        assert.equal(options.headers.Authorization, "Bearer token");
        state.duringDownload();
        return { uri: dest, status: state.downloadStatus };
      },
      cancelAsync: async () => {},
    }),
  };
  const api = loadTS(
    "services/petMedicalRecords.ts",
    {
      "@/lib/supabase": {
        supabase: {
          from: query,
          auth: {
            getSession: async () => ({
              data: { session: { access_token: "token" } },
            }),
          },
          storage: {
            from: () => ({
              createSignedUploadUrl: async (path) => {
                calls.push("sign");
                return { data: { signedUrl: path } };
              },
              remove: async (paths) => {
                calls.push("remove-storage");
                paths.forEach((path) => objects.delete(path));
                return { error: null };
              },
            }),
          },
        },
      },
      "@/services/medicalRecordFileActions": {
        shareLocalMedicalRecord: async () => {},
      },
      "@/lib/nativeFileTransfer": loadTS("lib/nativeFileTransfer.ts"),
      "@/lib/sessionGeneration": { sessionGeneration: () => state.generation },
      "@/lib/medicalRecordPreviewCache": {
        medicalRecordPreviewCacheDirectory: () => "file:///cache/previews/",
        pruneMedicalRecordPreviewCache: async () => {},
      },
      "@/utils/medicalRecordFiles": files,
      "@/lib/analytics": { trackMedicalRecordAdded: () => {} },
      "expo-crypto": { randomUUID: id },
      "expo-file-system/legacy": fs,
    },
    {
      process: {
        env: {
          EXPO_PUBLIC_SUPABASE_URL: "https://supabase.invalid",
          EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon",
        },
      },
    },
  );
  return { api, records, attachments, objects, calls, deleted, state };
}
const asset = (fileId, localUri = "file:///vet.pdf") => ({
  fileId,
  localUri,
  originalFilename: "Vet history.pdf",
  mimeType: "application/pdf",
  fileSizeBytes: 999,
});

test("file types and preview selection preserve unknown documents without treating them as JPEGs", () => {
  assert.equal(
    files.medicalRecordContentType("scan.pdf", "application/octet-stream"),
    "application/pdf",
  );
  assert.equal(
    files.medicalRecordContentType("data.zip", null),
    "application/octet-stream",
  );
  assert.equal(
    files.medicalRecordPreviewKind("scan.pdf", null, "android"),
    "external",
  );
  assert.equal(files.medicalRecordPreviewKind("scan.pdf", null, "ios"), "web");
  assert.equal(
    files.medicalRecordPreviewKind("active.html", "text/html", "ios"),
    "external",
  );
  assert.equal(
    files.medicalRecordPreviewKind("scan.png", null, "android"),
    "image",
  );
  assert.equal(
    files
      .medicalRecordFileName("../folder/report", "application/pdf")
      .includes("/"),
    false,
  );
  assert.throws(() => files.validateMedicalRecordFileSize(0), /empty/);
  assert.throws(
    () => files.validateMedicalRecordFileSize(26 * 1024 * 1024),
    /25 MB/,
  );
});

test("partial creation and retry reuse the record and skip committed file IDs", async () => {
  const f = fixture();
  const inputs = [asset("first"), asset("second", "file:///second.pdf")];
  f.state.failFile = inputs[1].localUri;
  let failure;
  try {
    await f.api.createPetMedicalRecordWithFiles(
      "pet",
      "owner",
      "History",
      inputs,
      "record",
    );
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof f.api.MedicalRecordUploadError);
  assert.equal(failure.recordId, "record");
  assert.deepEqual(Array.from(failure.uploadedFileIds), ["first"]);
  assert.equal(f.records.size, 1);
  assert.equal(f.attachments.size, 1);
  f.state.failFile = null;
  await f.api.createPetMedicalRecordWithFiles(
    "pet",
    "owner",
    "History",
    inputs,
    failure.recordId,
  );
  assert.equal(f.records.size, 1);
  assert.equal(f.attachments.size, 2);
  assert.equal(
    f.calls.filter((call) => call === "upload:file:///vet.pdf").length,
    1,
  );
  assert.equal(f.attachments.get("first").file_size_bytes, 42); // Actual size, not picker hint.
});

test("lost record and metadata responses reconcile without creating duplicates or deleting valid bytes", async () => {
  const f = fixture();
  f.state.recordResponseLost = true;
  await assert.rejects(
    () =>
      f.api.createPetMedicalRecordWithFiles(
        "pet",
        "owner",
        "History",
        [asset("first")],
        "record",
      ),
    /response lost/,
  );
  f.state.insertResponseLost = true;
  await f.api.createPetMedicalRecordWithFiles(
    "pet",
    "owner",
    "History",
    [asset("first")],
    "record",
  );
  assert.equal(f.records.size, 1);
  assert.equal(f.attachments.size, 1);
  assert.equal(f.objects.size, 1);
});

test("oversized files are rejected before signed upload and failed metadata rolls storage back", async () => {
  const f = fixture();
  f.state.size = 26 * 1024 * 1024;
  await assert.rejects(
    () =>
      f.api.uploadFileToMedicalRecord({
        ...asset("first"),
        petId: "pet",
        userId: "owner",
        medicalRecordId: "record",
      }),
    /25 MB/,
  );
  assert.equal(f.calls.includes("sign"), false);
  f.state.size = 42;
  f.state.metadataDenied = true;
  await assert.rejects(
    () =>
      f.api.uploadFileToMedicalRecord({
        ...asset("first"),
        petId: "pet",
        userId: "owner",
        medicalRecordId: "record",
      }),
    /metadata rejected/,
  );
  assert.equal(f.objects.size, 0);
});

test("record list gets aggregate attachment counts in one request", async () => {
  const f = fixture();
  f.records.set("record", { id: "record", pet_id: "pet" });
  f.attachments.set("file", { id: "file", medical_record_id: "record" });
  const result = await f.api.fetchPetMedicalRecordsList("pet");
  assert.equal(result.fileCounts.get("record"), 1);
  assert.equal(result.records[0].pet_medical_record_files, undefined);
  assert.equal(f.calls.length, 1);
});

test("file deletion commits metadata before removing bytes", async () => {
  const f = fixture();
  f.attachments.set("file", { id: "file", storage_path: "private/path" });
  await f.api.deleteMedicalRecordFile(f.attachments.get("file"));
  assert.ok(
    f.calls.indexOf("delete:pet_medical_record_files") <
      f.calls.indexOf("remove-storage"),
  );
});

test("authenticated download preserves its filename and rejects incomplete/error/account-changed copies", async () => {
  const f = fixture();
  const input = {
    id: "file",
    original_filename: "Vet history.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 42,
  };
  const uri = await f.api.downloadMedicalRecordFileForOpening(input);
  assert.match(uri, /Vet%20history\.pdf$/);
  f.state.size = 2;
  await assert.rejects(
    () => f.api.downloadMedicalRecordFileForOpening(input),
    /incomplete/,
  );
  assert.equal(f.deleted.length, 1);
  f.state.downloadStatus = 403;
  await assert.rejects(
    () => f.api.downloadMedicalRecordFileForOpening(input),
    /Access denied/,
  );
  f.state.downloadStatus = 200;
  f.state.size = 42;
  f.state.duringDownload = () => {
    f.state.generation++;
  };
  await assert.rejects(
    () => f.api.downloadMedicalRecordFileForOpening(input),
    /account changed/,
  );
});

test("hung native transfers cancel and successful transfers clear their timer", async () => {
  const { runNativeFileTransfer } = loadTS("lib/nativeFileTransfer.ts");
  let cancelled = 0;
  await assert.rejects(
    () =>
      runNativeFileTransfer(
        () => new Promise(() => {}),
        async () => {
          cancelled++;
        },
        5,
      ),
    /timed out/,
  );
  assert.equal(cancelled, 1);
  assert.equal(
    await runNativeFileTransfer(
      async () => "done",
      async () => {
        cancelled++;
      },
      5,
    ),
    "done",
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(cancelled, 1);
});

function hookFixture() {
  const slots = [],
    effects = [],
    alerts = [],
    downloads = [];
  let cursor = 0;
  const react = {
    useState: (initial) => {
      const position = cursor++;
      if (!(position in slots)) slots[position] = initial;
      return [
        slots[position],
        (value) => {
          slots[position] =
            typeof value === "function" ? value(slots[position]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const position = cursor++;
      return (slots[position] ??= { current: initial });
    },
    useCallback: (callback) => callback,
    useEffect: (effect) => {
      const position = cursor++;
      if (!(position in slots)) {
        slots[position] = true;
        effects.push(effect());
      }
    },
  };
  const { useMedicalRecordPreview } = loadTS(
    "hooks/useMedicalRecordPreview.ts",
    {
      react,
      "react-native": { Alert: { alert: (...args) => alerts.push(args) } },
      "@/services/petMedicalRecords": {
        downloadMedicalRecordFileForOpening: () =>
          new Promise((resolve, reject) => downloads.push({ resolve, reject })),
      },
    },
  );
  return {
    render: function PreviewHarness() {
      cursor = 0;
      return useMedicalRecordPreview("record");
    },
    downloads,
    alerts,
    unmount: () => effects.forEach((effect) => effect?.()),
  };
}

test("closing during a download, switching files, and unmounting ignore stale viewer results", async () => {
  const f = hookFixture();
  const first = f.render().open({ id: "first" });
  assert.equal(f.render().preview.loading, true);
  f.render().close();
  f.downloads[0].resolve("file:///first.pdf");
  await first;
  assert.equal(f.render().preview, null);
  const second = f.render().open({ id: "second" });
  const third = f.render().open({ id: "third" });
  f.downloads[2].resolve("file:///third.pdf");
  await third;
  f.downloads[1].resolve("file:///second.pdf");
  await second;
  assert.equal(f.render().preview.file.id, "third");
  const fourth = f.render().open({ id: "fourth" });
  f.unmount();
  f.downloads[3].reject(Error("offline"));
  await fourth;
  assert.equal(f.alerts.length, 0);
});

test("viewer exposes Close, Save and Share during a preview and keeps Close enabled while loading", async () => {
  const { jsx, jsxs } = require("react/jsx-runtime");
  let closed = 0,
    saves = 0,
    shares = 0;
  const { default: Viewer } = loadTS(
    "components/medical/MedicalRecordFilePreviewModal.tsx",
    {
      "@/components/ui/buttons/OrangeButton": {
        __esModule: true,
        default: "OrangeButton",
      },
      "@/services/medicalRecordFileActions": {
        saveLocalMedicalRecord: async () => {
          saves++;
        },
        shareLocalMedicalRecord: async () => {
          shares++;
        },
        openLocalMedicalRecord: async () => {},
      },
      "@/theme/colors": { Colors: {} },
      "@/theme/typography": { Font: {} },
      "@/utils/medicalRecordFiles": files,
      "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
      "expo-image": { Image: "Image" },
      react: {
        useState: (value) => [value, () => {}],
        useRef: (value) => ({ current: value }),
        useEffect: () => {},
      },
      "react/jsx-runtime": { jsx, jsxs },
      "react-native": {
        ActivityIndicator: "Spinner",
        Alert: { alert() {} },
        Modal: "Modal",
        Platform: { OS: "ios" },
        Pressable: "Pressable",
        ScrollView: "ScrollView",
        StyleSheet: { create: (styles) => styles },
        Text: "Text",
        View: "View",
      },
      "react-native-safe-area-context": {
        SafeAreaProvider: "SafeAreaProvider",
        SafeAreaView: "SafeAreaView",
      },
      "react-native-webview": { WebView: "WebView" },
    },
  );
  const find = (node, label) => {
    if (!node || typeof node !== "object") return;
    if (node.props?.accessibilityLabel === label) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, label);
      if (result) return result;
    }
  };
  const props = {
    visible: true,
    loading: false,
    localUri: "file:///cache/record.pdf",
    mimeType: "application/pdf",
    filename: "record.pdf",
    onClose: () => {
      closed++;
    },
  };
  const viewer = Viewer(props);
  await find(viewer, "Save document").props.onPress();
  // onPress intentionally fires void promises, settle the action before the next.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await find(viewer, "Share document").props.onPress();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(saves, 1);
  assert.equal(shares, 1);
  const loading = Viewer({ ...props, loading: true, localUri: null });
  assert.equal(find(loading, "Save document").props.disabled, true);
  assert.equal(
    find(loading, "Close document viewer").props.disabled,
    undefined,
  );
  find(loading, "Close document viewer").props.onPress();
  loading.props.onRequestClose();
  assert.equal(closed, 2);
});

test("Android save writes bounded chunks to SAF and cancellation leaves no file", async () => {
  let granted = true,
    created = 0,
    closed = 0,
    written = 0;
  const source = {
    readBytes: async (size) => {
      assert.equal(size, 256 * 1024);
      if (written) return new Uint8Array(0);
      return new Uint8Array([1, 2, 3]);
    },
    close: () => {
      closed++;
    },
  };
  const target = {
    writeBytes: async (chunk) => {
      written += chunk.length;
    },
    close: () => {
      closed++;
    },
  };
  const { saveLocalMedicalRecord } = loadTS(
    "services/medicalRecordFileActions.ts",
    {
      "expo-file-system": {
        File: class {
          constructor(uri) {
            this.uri = uri;
          }
          open() {
            return this.uri.startsWith("content:") ? target : source;
          }
        },
        FileMode: { ReadOnly: "r", WriteOnly: "w" },
      },
      "expo-file-system/legacy": {
        StorageAccessFramework: {
          requestDirectoryPermissionsAsync: async () => ({
            granted,
            directoryUri: "content://folder",
          }),
          createFileAsync: async () => {
            created++;
            return "content://file";
          },
        },
      },
      "expo-sharing": {},
      "react-native": { Platform: { OS: "android" } },
      "@/utils/medicalRecordFiles": files,
    },
  );
  assert.equal(
    await saveLocalMedicalRecord(
      "file:///record.pdf",
      "record.pdf",
      "application/pdf",
    ),
    true,
  );
  assert.equal(written, 3);
  assert.equal(closed, 2);
  granted = false;
  assert.equal(
    await saveLocalMedicalRecord(
      "file:///record.pdf",
      "record.pdf",
      "application/pdf",
    ),
    false,
  );
  assert.equal(created, 1);
});
