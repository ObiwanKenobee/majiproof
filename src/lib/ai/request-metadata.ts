import { randomUUID } from "node:crypto";
import type { AIProviderId, InferenceLogRecord, InferenceOperation, InferencePromptVersion, ModelAttribution, ProviderCall } from "@/types/ai";
import { estimateListCost } from "@/lib/ai/pricing";

export function createRequestId(): string {
  return randomUUID();
}

export function buildInferenceRecord(options: {
  requestId: string;
  inspectionId?: string;
  benchmarkRunId?: string;
  providerId: AIProviderId;
  model: ModelAttribution;
  operation: InferenceOperation;
  stage?: "before" | "after";
  promptVersion: InferencePromptVersion;
  resultCount?: number;
  startedAt: string;
  startedMs: number;
  outcome: "success" | "failed";
  verificationResult?: InferenceLogRecord["verificationResult"];
  call?: Pick<ProviderCall<unknown>, "usage" | "estimatedListCostUsd" | "providerRequestId">;
  errorCategory?: InferenceLogRecord["errorCategory"];
}): InferenceLogRecord {
  const completedMs = Date.now();
  const usage = options.call?.usage;
  const estimatedListCostUsd = options.call?.estimatedListCostUsd ?? (usage ? estimateListCost(options.providerId, usage) : undefined);
  return {
    requestId: options.requestId,
    ...(options.call?.providerRequestId ? { providerRequestId: options.call.providerRequestId } : {}),
    ...(options.inspectionId ? { inspectionId: options.inspectionId } : {}),
    ...(options.benchmarkRunId ? { benchmarkRunId: options.benchmarkRunId } : {}),
    providerId: options.providerId,
    modelId: options.model.modelId,
    modelVariant: options.model.variant,
    modelAttribution: options.model,
    operation: options.operation,
    ...(options.stage ? { stage: options.stage } : {}),
    promptVersion: options.promptVersion,
    verificationResult: options.verificationResult ?? (options.outcome === "success" ? "validated" : options.errorCategory === "configuration" ? "not_run" : "failed"),
    ...(options.resultCount === undefined ? {} : { resultCount: options.resultCount }),
    startedAt: options.startedAt,
    completedAt: new Date(completedMs).toISOString(),
    latencyMs: Math.max(0, completedMs - options.startedMs),
    ...(usage ? { usage } : {}),
    ...(estimatedListCostUsd === undefined ? {} : { estimatedListCostUsd }),
    outcome: options.outcome,
    ...(options.errorCategory ? { errorCategory: options.errorCategory } : {}),
  };
}
