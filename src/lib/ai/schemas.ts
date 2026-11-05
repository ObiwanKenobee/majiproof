import { z } from "zod";
import { analysisSchema, comparisonSchema } from "@/lib/schemas";

export const providerIdSchema = z.enum(["meta", "fireworks", "baseten", "modal"]);
export const analysisOutputSchema = analysisSchema;
export const comparisonOutputSchema = comparisonSchema;

export const providerUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
});

export const modelAttributionSchema = z.object({
  providerId: providerIdSchema,
  modelId: z.string().trim().min(1).max(240),
  variant: z.enum(["muse-spark-1.3", "muse-spark-open", "sam-3.1"]),
  displayName: z.string().trim().min(1).max(160),
  endpointLabel: z.string().trim().min(1).max(160),
});

export const inferenceLogSchema = z.object({
  requestId: z.string().uuid(),
  providerRequestId: z.string().trim().max(240).optional(),
  inspectionId: z.string().trim().max(100).optional(),
  benchmarkRunId: z.string().trim().max(100).optional(),
  providerId: providerIdSchema,
  modelId: z.string().trim().min(1).max(240),
  modelVariant: z.enum(["muse-spark-1.3", "muse-spark-open", "sam-3.1"]),
  modelAttribution: modelAttributionSchema,
  stage: z.enum(["before", "after"]).optional(),
  promptVersion: z.enum(["inspection-v1", "comparison-v1", "sam-noun-v1"]),
  verificationResult: z.enum(["validated", "failed", "not_run"]),
  resultCount: z.number().int().nonnegative().max(100_000).optional(),
  operation: z.enum(["analysis", "comparison", "segmentation", "benchmark-analysis"]),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  latencyMs: z.number().int().nonnegative().max(600_000),
  usage: providerUsageSchema.optional(),
  estimatedListCostUsd: z.number().finite().nonnegative().max(10_000).optional(),
  outcome: z.enum(["success", "failed"]),
  errorCategory: z.enum(["configuration", "billing", "authentication", "access", "model_unavailable", "rate_limit", "timeout", "payload_limit", "invalid_output", "provider_error", "request_rejected"]).optional(),
});

export const analysisWithAttributionSchema = analysisSchema.extend({ attribution: modelAttributionSchema.optional() });
export const comparisonWithAttributionSchema = comparisonSchema.extend({ attribution: modelAttributionSchema.optional() });
export const benchmarkRatingSchema = z.object({
  visualAccuracy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  evidenceDiscipline: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  schemaValidity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  technicianRelevance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  segmentationPromptRelevance: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
});
export const benchmarkRunSchema = inferenceLogSchema.extend({
  stage: z.enum(["before", "after"]),
  imageFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  promptFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  analysis: analysisWithAttributionSchema.optional(),
  ratings: benchmarkRatingSchema.optional(),
  evaluatorNotes: z.string().max(1200).optional(),
});

export const developerEvaluationInputSchema = z.object({
  providerId: providerIdSchema,
  modelId: z.string().trim().min(1).max(240),
  benchmarkRunId: z.string().uuid(),
  stage: z.enum(["before", "after"]),
  description: z.string().trim().max(800),
  inspectionId: z.string().trim().max(100).optional(),
  imageFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  promptFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
});
