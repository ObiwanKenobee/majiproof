import type { ProviderFailureCategory, ProviderVerificationState } from "@/types/ai";

type LastCheck = { outcome: "success" | "failed"; at: string; errorCategory?: ProviderFailureCategory };
const lastChecks = new Map<string, LastCheck>();

export function recordModelCheck(modelKey: string, outcome: "success" | "failed", errorCategory?: ProviderFailureCategory): void {
  lastChecks.set(modelKey, {
    outcome,
    at: new Date().toISOString(),
    ...(errorCategory ? { errorCategory } : {}),
  });
}

export function readModelCheck(modelKey: string): LastCheck | undefined {
  return lastChecks.get(modelKey);
}

export function verificationState(configured: boolean, check?: LastCheck): ProviderVerificationState {
  if (!configured || !check) return "not_yet_tested";
  return check.outcome === "success" ? "available" : "failed_health_check";
}
