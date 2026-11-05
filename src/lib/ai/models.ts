import type { AIProviderId, ModelAttribution } from "@/types/ai";

export const META_MUSE_MODEL: ModelAttribution = {
  providerId: "meta",
  modelId: "muse-spark-1.3",
  variant: "muse-spark-1.3",
  displayName: "Muse Spark 1.3 · Meta",
  endpointLabel: "Meta Model API · Responses",
};
export const META_SAM_MODEL: ModelAttribution = {
  providerId: "meta",
  modelId: "sam-3.1",
  variant: "sam-3.1",
  displayName: "SAM 3.1 · Meta",
  endpointLabel: "Meta Model API · streamed Responses",
};

export const PROVIDER_LABELS: Record<AIProviderId, string> = {
  meta: "Meta Model API",
  fireworks: "Fireworks AI",
  baseten: "Baseten",
  modal: "Modal Shared Endpoint",
};

export const OPEN_MUSE_MODELS: Record<Exclude<AIProviderId, "meta">, string> = {
  fireworks: "accounts/fireworks/models/muse-spark-open",
  baseten: "meta-models/muse-spark-open",
  modal: "Project endpoint model name (set from the Modal dashboard)",
};
