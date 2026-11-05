import type { ModelAttribution, ProviderStatus } from "@/types/ai";
import { readModelCheck } from "@/lib/ai/observability";

export function modelReadiness(model: ModelAttribution, configured: boolean): Pick<ProviderStatus, "configuration" | "verification" | "lastCheck"> {
  const check = readModelCheck(`${model.providerId}:${model.modelId}`);
  return {
    configuration: configured ? "configured" : "not_configured",
    verification: !check ? "not_yet_tested" : check.outcome === "success" ? "available" : "failed_health_check",
    ...(check ? { lastCheck: check } : {}),
  };
}
