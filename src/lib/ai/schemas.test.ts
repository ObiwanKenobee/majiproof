import { describe, expect, it } from "vitest";
import { analysisOutputSchema, inferenceLogSchema, modelAttributionSchema } from "@/lib/ai/schemas";

const analysis = {
  sceneSummary: "A water point is visible.", visibleConditions: [], visibleFlow: "unclear", missingEvidence: [], suggestedActions: [], limitations: ["Appearance is not a water-quality test."],
};
const model = { providerId: "meta", modelId: "muse-spark-1.3", variant: "muse-spark-1.3", displayName: "Muse Spark 1.3 · Meta", endpointLabel: "Meta Model API · Responses" };
const log = {
  requestId: "550e8400-e29b-41d4-a716-446655440000", providerId: "meta", modelId: model.modelId, modelVariant: model.variant,
  modelAttribution: model, operation: "analysis", stage: "before", promptVersion: "inspection-v1", verificationResult: "validated",
  startedAt: "2026-11-04T00:00:00.000Z", completedAt: "2026-11-04T00:00:01.000Z", latencyMs: 100, outcome: "success",
};

describe("normalized structured model schemas", () => {
  it("accepts a valid shared observation and rejects invalid confidence or unsupported diagnoses", () => {
    expect(analysisOutputSchema.safeParse(analysis).success).toBe(true);
    expect(analysisOutputSchema.safeParse({ ...analysis, visibleFlow: "flow_rate_is_safe" }).success).toBe(false);
    expect(analysisOutputSchema.safeParse({ ...analysis, sceneSummary: "" }).success).toBe(false);
  });

  it("requires provider identity and a bounded non-secret endpoint label", () => {
    expect(modelAttributionSchema.safeParse(model).success).toBe(true);
    expect(modelAttributionSchema.safeParse({ ...model, endpointLabel: "" }).success).toBe(false);
    expect(modelAttributionSchema.safeParse({ ...model, providerId: "unknown" }).success).toBe(false);
  });

  it("strips unrecognized prompt, data URL and credential properties from persisted logs", () => {
    const secret = "TEST_ONLY_SECRET_VALUE";
    const parsed = inferenceLogSchema.parse({ ...log, apiKey: secret, fullPrompt: "private note", dataUrl: "data:image/png;base64,raw" });
    expect(parsed).not.toHaveProperty("apiKey");
    expect(parsed).not.toHaveProperty("fullPrompt");
    expect(parsed).not.toHaveProperty("dataUrl");
    expect(JSON.stringify(parsed)).not.toContain(secret);
  });
});
