import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { averageLatency, benchmarkManifestSchema, matchingBenchmarkRuns } from "@/lib/ai/benchmark";
import type { BenchmarkRunRecord } from "@/types/ai";

const model = { providerId: "meta" as const, modelId: "muse-spark-1.3", variant: "muse-spark-1.3" as const, displayName: "Muse Spark 1.3 · Meta", endpointLabel: "Meta Model API · Responses" };

function run(requestId: string, imageFingerprint: string, promptFingerprint: string, outcome: "success" | "failed", latencyMs: number): BenchmarkRunRecord {
  return {
    requestId, benchmarkRunId: requestId, providerId: "meta", modelId: model.modelId, modelVariant: model.variant,
    modelAttribution: model, operation: "benchmark-analysis", stage: "before", promptVersion: "inspection-v1",
    verificationResult: outcome === "success" ? "validated" : "failed", startedAt: "2026-11-04T00:00:00.000Z",
    completedAt: "2026-11-04T00:00:01.000Z", latencyMs, outcome, imageFingerprint, promptFingerprint,
  };
}

describe("benchmark manifest and cohorts", () => {
  it("validates the ten-slot structure without any fabricated example records", () => {
    const template = JSON.parse(readFileSync("data/benchmark/manifest.template.json", "utf8")) as unknown;
    const result = benchmarkManifestSchema.parse(template);
    expect(result.slotCount).toBe(10);
    expect(result.records).toEqual([]);
    expect(benchmarkManifestSchema.safeParse({ ...result, records: [{ fakeLabel: "pump fixed" }] }).success).toBe(false);
  });

  it("compares only runs with both identical fingerprints", () => {
    const runs = [
      run("one", "a".repeat(64), "b".repeat(64), "success", 100),
      run("two", "a".repeat(64), "c".repeat(64), "success", 900),
      run("three", "d".repeat(64), "b".repeat(64), "failed", 40),
    ];
    expect(matchingBenchmarkRuns(runs, "a".repeat(64), "b".repeat(64)).map((entry) => entry.requestId)).toEqual(["one"]);
  });

  it("reports latency only for successful real responses", () => {
    expect(averageLatency([run("one", "a", "b", "success", 100), run("two", "a", "b", "failed", 1_000)])).toBe(100);
    expect(averageLatency([run("failed", "a", "b", "failed", 100)])).toBeUndefined();
  });
});
