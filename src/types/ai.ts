import type { AnalysisOutput, ComparisonOutput } from "@/lib/schemas";

export const AI_PROVIDER_IDS = ["meta", "fireworks", "baseten", "modal"] as const;
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];
export type VisionModelVariant = "muse-spark-1.3" | "muse-spark-open";
export interface AIConfiguration {
  primaryVisionProvider: AIProviderId;
  primaryVisionModel: string;
  segmentationProvider: "meta";
  segmentationModel: "sam-3.1";
  experimentalProvider?: AIProviderId;
  experimentationEnabled: boolean;
  allowExperimentalFieldProvider: boolean;
}
export type InferenceOperation = "analysis" | "comparison" | "segmentation" | "benchmark-analysis";
export type InferencePromptVersion = "inspection-v1" | "comparison-v1" | "sam-noun-v1";
export type ModelVerificationResult = "validated" | "failed" | "not_run";
export type ProviderFailureCategory = "configuration" | "billing" | "authentication" | "access" | "model_unavailable" | "rate_limit" | "timeout" | "payload_limit" | "invalid_output" | "provider_error" | "request_rejected";

export interface ModelAttribution {
  providerId: AIProviderId;
  modelId: string;
  variant: VisionModelVariant | "sam-3.1";
  displayName: string;
  endpointLabel: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface ProviderCall<T> {
  data: T;
  model: ModelAttribution;
  usage?: TokenUsage;
  providerRequestId?: string;
  estimatedListCostUsd?: number;
  correctionAttempts?: number;
}

export interface ProviderImage {
  dataUrl: string;
  mimeType: string;
  byteLength: number;
}

export interface AnalysisContext {
  stage: "before" | "after";
  description: string;
}

export interface ComparisonContext {
  assetDescription: string;
  beforeFindings: string;
  afterFindings: string;
}

export interface VisionProvider {
  readonly id: AIProviderId;
  readonly model: ModelAttribution;
  isConfigured(): boolean;
  analyzeImage(image: ProviderImage, context: AnalysisContext): Promise<ProviderCall<AnalysisOutput>>;
  compareEvidence(before: ProviderImage, after: ProviderImage, context: ComparisonContext): Promise<ProviderCall<ComparisonOutput>>;
}

export type ProviderVerificationState = "available" | "failed_health_check" | "not_yet_tested";
export interface ProviderStatus {
  providerId: AIProviderId;
  model: ModelAttribution | null;
  configuration: "configured" | "not_configured";
  verification: ProviderVerificationState;
  enabled: boolean;
  fieldDefault: boolean;
  reason?: string;
  lastCheck?: { outcome: "success" | "failed"; at: string; errorCategory?: ProviderFailureCategory };
}

export interface InferenceLogRecord {
  requestId: string;
  providerRequestId?: string;
  inspectionId?: string;
  benchmarkRunId?: string;
  providerId: AIProviderId;
  modelId: string;
  modelVariant: ModelAttribution["variant"];
  operation: InferenceOperation;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  usage?: TokenUsage;
  estimatedListCostUsd?: number;
  outcome: "success" | "failed";
  errorCategory?: ProviderFailureCategory;
  modelAttribution: ModelAttribution;
  stage?: "before" | "after";
  promptVersion: InferencePromptVersion;
  verificationResult: ModelVerificationResult;
  resultCount?: number;
}

export type BenchmarkRatingKey = "visualAccuracy" | "evidenceDiscipline" | "schemaValidity" | "technicianRelevance" | "segmentationPromptRelevance";
export type BenchmarkRatings = Partial<Record<BenchmarkRatingKey, 1 | 2 | 3 | 4 | 5>>;

export interface BenchmarkRunRecord extends InferenceLogRecord {
  stage: "before" | "after";
  imageFingerprint: string;
  promptFingerprint: string;
  analysis?: AnalysisOutput;
  ratings?: BenchmarkRatings;
  evaluatorNotes?: string;
}
