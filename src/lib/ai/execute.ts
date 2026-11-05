import { withInferenceCapacity } from "@/lib/ai/concurrency";
import { classifyProviderFailure, safeProviderMessage, safeStatusCode } from "@/lib/ai/errors";
import { buildInferenceRecord, createRequestId } from "@/lib/ai/request-metadata";
import { PROVIDER_LABELS } from "@/lib/ai/models";
import { recordModelCheck } from "@/lib/ai/observability";
import type { AIProviderId, InferenceLogRecord, InferenceOperation, InferencePromptVersion, ModelAttribution, ProviderCall } from "@/types/ai";

export class InferenceExecutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly inference: InferenceLogRecord,
  ) {
    super(message);
    this.name = "InferenceExecutionError";
  }
}

export async function executeModelCall<T>(options: {
  providerId: AIProviderId;
  model: ModelAttribution;
  operation: InferenceOperation;
  stage?: "before" | "after";
  promptVersion: InferencePromptVersion;
  resultCount?: (data: T) => number;
  inspectionId?: string;
  benchmarkRunId?: string;
  call: () => Promise<ProviderCall<T>>;
}): Promise<{ call: ProviderCall<T>; inference: InferenceLogRecord }> {
  const requestId = createRequestId();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const modelKey = `${options.model.providerId}:${options.model.modelId}`;
  try {
    const call = await withInferenceCapacity(options.call);
    const resultCount = options.resultCount?.(call.data);
    const inference = buildInferenceRecord({
      requestId,
      inspectionId: options.inspectionId,
      benchmarkRunId: options.benchmarkRunId,
      providerId: options.providerId,
      model: options.model,
      operation: options.operation,
      ...(options.stage ? { stage: options.stage } : {}),
      promptVersion: options.promptVersion,
      ...(resultCount === undefined ? {} : { resultCount }),
      startedAt,
      startedMs,
      outcome: "success",
      call,
    });
    recordModelCheck(modelKey, "success");
    return { call, inference };
  } catch (error) {
    const category = classifyProviderFailure(error);
    const didNotReachProvider = category === "configuration" || (error instanceof Error && error.name === "InferenceCapacityError");
    const inference = buildInferenceRecord({
      requestId,
      inspectionId: options.inspectionId,
      benchmarkRunId: options.benchmarkRunId,
      providerId: options.providerId,
      model: options.model,
      operation: options.operation,
      ...(options.stage ? { stage: options.stage } : {}),
      promptVersion: options.promptVersion,
      startedAt,
      startedMs,
      outcome: "failed",
      verificationResult: didNotReachProvider ? "not_run" : "failed",
      errorCategory: category,
    });
    if (!didNotReachProvider) recordModelCheck(modelKey, "failed", category);
    throw new InferenceExecutionError(
      safeProviderMessage(error, PROVIDER_LABELS[options.providerId]),
      safeStatusCode(error),
      inference,
    );
  }
}
