import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { getInspection, listBenchmarkRuns, listInferenceLogs, saveBenchmarkRun, saveInferenceLog, updateBenchmarkRatings } from "@/lib/storage/indexeddb";
import type { BenchmarkRunRecord, InferenceLogRecord, ModelAttribution } from "@/types/ai";

const model: ModelAttribution = { providerId: "meta", modelId: "muse-spark-1.3", variant: "muse-spark-1.3", displayName: "Muse Spark 1.3 · Meta", endpointLabel: "Meta Model API · Responses" };
const inference: InferenceLogRecord = {
  requestId: "550e8400-e29b-41d4-a716-446655440000", providerId: "meta", modelId: model.modelId, modelVariant: model.variant, modelAttribution: model,
  operation: "benchmark-analysis", benchmarkRunId: "550e8400-e29b-41d4-a716-446655440001", stage: "before", promptVersion: "inspection-v1",
  verificationResult: "validated", startedAt: "2026-11-04T00:00:00.000Z", completedAt: "2026-11-04T00:00:01.000Z", latencyMs: 100, outcome: "success",
};

function requestDone(request: IDBOpenDBRequest): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal("indexedDB", factory);
  vi.stubGlobal("window", {});
});
afterEach(() => vi.unstubAllGlobals());

describe("local inference and benchmark persistence", () => {
  it("adds new stores through an upgrade while preserving an existing v1 inspection", async () => {
    const opening = factory.open("majiproof-local", 1);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      db.createObjectStore("inspections", { keyPath: "id" }).put({ id: "existing-case", assetId: "WP-1" });
      const evidence = db.createObjectStore("evidence", { keyPath: "id" });
      evidence.createIndex("inspectionId", "inspectionId", { unique: false });
      const reviews = db.createObjectStore("reviews", { keyPath: "id" });
      reviews.createIndex("inspectionId", "inspectionId", { unique: false });
    };
    const oldDb = await requestDone(opening);
    oldDb.close();

    await saveInferenceLog(inference);
    expect((await getInspection("existing-case"))?.assetId).toBe("WP-1");
    expect((await listInferenceLogs()).map((entry) => entry.requestId)).toContain(inference.requestId);
  });

  it("keeps local benchmark outputs and updates reviewer ratings without storing photo blobs", async () => {
    const record: BenchmarkRunRecord = {
      ...inference, stage: "before", imageFingerprint: "a".repeat(64), promptFingerprint: "b".repeat(64),
      analysis: { sceneSummary: "A pump is visible.", visibleConditions: [], visibleFlow: "unclear", missingEvidence: [], suggestedActions: [], limitations: [] },
    };
    await saveBenchmarkRun(record);
    const updated = await updateBenchmarkRatings(record.requestId, { visualAccuracy: 4, evidenceDiscipline: 5 }, "Mostly supported by the image.");
    expect(updated?.ratings?.visualAccuracy).toBe(4);
    expect(updated?.evaluatorNotes).toContain("supported");
    expect((await listBenchmarkRuns())[0]).not.toHaveProperty("blob");
  });
});
