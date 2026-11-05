import type {
  EvidenceWithBlob,
  HumanReview,
  InspectionBundle,
  InspectionCase,
  StoredEvidence,
  VisualComparison,
} from "@/types/inspection";
import type { BenchmarkRunRecord, BenchmarkRatings, InferenceLogRecord } from "@/types/ai";

const DATABASE_NAME = "majiproof-local";
const DATABASE_VERSION = 2;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser storage is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("inspections")) db.createObjectStore("inspections", { keyPath: "id" });
      if (!db.objectStoreNames.contains("evidence")) {
        const store = db.createObjectStore("evidence", { keyPath: "id" });
        store.createIndex("inspectionId", "inspectionId", { unique: false });
      }
      if (!db.objectStoreNames.contains("reviews")) {
        const store = db.createObjectStore("reviews", { keyPath: "id" });
        store.createIndex("inspectionId", "inspectionId", { unique: false });
      }
      if (!db.objectStoreNames.contains("inferenceLogs")) {
        const store = db.createObjectStore("inferenceLogs", { keyPath: "requestId" });
        store.createIndex("completedAt", "completedAt", { unique: false });
        store.createIndex("providerId", "providerId", { unique: false });
      }
      if (!db.objectStoreNames.contains("benchmarkRuns")) {
        const store = db.createObjectStore("benchmarkRuns", { keyPath: "requestId" });
        store.createIndex("completedAt", "completedAt", { unique: false });
        store.createIndex("imageFingerprint", "imageFingerprint", { unique: false });
        store.createIndex("promptFingerprint", "promptFingerprint", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local inspection storage."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage request failed."));
  });
}

async function storeValue(storeName: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local data."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local save was interrupted."));
    });
  } finally {
    db.close();
  }
}

export async function listInspections(): Promise<InspectionCase[]> {
  const db = await openDatabase();
  try {
    const cases = await requestResult(db.transaction("inspections", "readonly").objectStore("inspections").getAll()) as InspectionCase[];
    return cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function getInspection(id: string): Promise<InspectionCase | undefined> {
  const db = await openDatabase();
  try {
    return await requestResult(db.transaction("inspections", "readonly").objectStore("inspections").get(id)) as InspectionCase | undefined;
  } finally {
    db.close();
  }
}

export async function saveInspection(value: InspectionCase): Promise<void> {
  await storeValue("inspections", value);
}

export async function getEvidenceForInspection(inspectionId: string): Promise<EvidenceWithBlob[]> {
  const db = await openDatabase();
  try {
    const values = await requestResult(db.transaction("evidence", "readonly").objectStore("evidence").index("inspectionId").getAll(inspectionId)) as StoredEvidence[];
    return values.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}

export async function saveEvidence(value: StoredEvidence): Promise<void> {
  await storeValue("evidence", value);
}

export async function deleteEvidence(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction("evidence", "readwrite");
    transaction.objectStore("evidence").delete(id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove local evidence."));
    });
  } finally {
    db.close();
  }
}

export async function saveComparison(inspectionId: string, comparison: VisualComparison): Promise<void> {
  const existing = await getEvidenceForInspection(inspectionId);
  if (existing.length) await saveEvidence({ ...existing[0], comparison });
}

export async function deleteComparison(inspectionId: string): Promise<void> {
  const existing = await getEvidenceForInspection(inspectionId);
  await Promise.all(existing.filter((item) => item.comparison).map((item) => {
    const updated = { ...item };
    delete updated.comparison;
    return saveEvidence(updated);
  }));
}

export async function getReview(inspectionId: string): Promise<HumanReview | undefined> {
  const db = await openDatabase();
  try {
    const all = await requestResult(db.transaction("reviews", "readonly").objectStore("reviews").index("inspectionId").getAll(inspectionId)) as HumanReview[];
    return all.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
  } finally {
    db.close();
  }
}

export async function saveReview(value: HumanReview): Promise<void> {
  await storeValue("reviews", value);
}

export async function getInspectionBundle(id: string): Promise<InspectionBundle | undefined> {
  const [inspection, evidence, review] = await Promise.all([getInspection(id), getEvidenceForInspection(id), getReview(id)]);
  if (!inspection) return undefined;
  const comparison = evidence.find((item) => item.comparison)?.comparison;
  return { inspection, evidence, comparison, review };
}

export async function saveInferenceLog(value: InferenceLogRecord): Promise<void> {
  await storeValue("inferenceLogs", value);
}

export async function listInferenceLogs(limit = 200): Promise<InferenceLogRecord[]> {
  const db = await openDatabase();
  try {
    const entries = await requestResult(db.transaction("inferenceLogs", "readonly").objectStore("inferenceLogs").getAll()) as InferenceLogRecord[];
    return entries.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, Math.max(1, Math.min(limit, 500)));
  } finally {
    db.close();
  }
}

export async function saveBenchmarkRun(value: BenchmarkRunRecord): Promise<void> {
  await storeValue("benchmarkRuns", value);
}

export async function listBenchmarkRuns(limit = 200): Promise<BenchmarkRunRecord[]> {
  const db = await openDatabase();
  try {
    const entries = await requestResult(db.transaction("benchmarkRuns", "readonly").objectStore("benchmarkRuns").getAll()) as BenchmarkRunRecord[];
    return entries.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, Math.max(1, Math.min(limit, 500)));
  } finally {
    db.close();
  }
}

export async function updateBenchmarkRatings(requestId: string, ratings: BenchmarkRatings, evaluatorNotes: string): Promise<BenchmarkRunRecord | undefined> {
  const db = await openDatabase();
  try {
    const transaction = db.transaction("benchmarkRuns", "readwrite");
    const store = transaction.objectStore("benchmarkRuns");
    const existing = await requestResult(store.get(requestId)) as BenchmarkRunRecord | undefined;
    if (!existing) return undefined;
    const updated = { ...existing, ratings, evaluatorNotes: evaluatorNotes.slice(0, 1200) };
    store.put(updated);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not update the local benchmark review."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Local benchmark review was interrupted."));
    });
    return updated;
  } finally {
    db.close();
  }
}
