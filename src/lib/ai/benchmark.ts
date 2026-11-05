import { z } from "zod";
import type { BenchmarkRunRecord } from "@/types/ai";

const requiredBenchmarkFields = ["image", "stage", "promptVersion", "providerId", "modelId", "humanLabels", "humanRatings"] as const;

export const benchmarkManifestSchema = z.object({
  title: z.literal("MajiProof empty inspection benchmark template"),
  status: z.literal("unpopulated"),
  slotCount: z.literal(10),
  records: z.tuple([]),
  requiredFields: z.array(z.enum(requiredBenchmarkFields)).length(requiredBenchmarkFields.length),
}).strict();

export function matchingBenchmarkRuns(runs: BenchmarkRunRecord[], imageFingerprint: string, promptFingerprint: string): BenchmarkRunRecord[] {
  return runs.filter((run) => run.imageFingerprint === imageFingerprint && run.promptFingerprint === promptFingerprint);
}

export function averageLatency(runs: BenchmarkRunRecord[]): number | undefined {
  const successes = runs.filter((run) => run.outcome === "success");
  if (!successes.length) return undefined;
  return Math.round(successes.reduce((sum, run) => sum + run.latencyMs, 0) / successes.length);
}
