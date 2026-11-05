import { NextResponse } from "next/server";
import { classifyProviderFailure, safeProviderMessage, safeStatusCode } from "@/lib/ai/errors";
import { PROVIDER_LABELS } from "@/lib/ai/models";
import { InferenceExecutionError } from "@/lib/ai/execute";
import type { AIProviderId } from "@/types/ai";

export function providerErrorResponse(error: unknown, providerId?: AIProviderId): NextResponse {
  if (error instanceof InferenceExecutionError) {
    return NextResponse.json({ error: error.message, errorCategory: error.inference.errorCategory, inference: error.inference }, { status: error.status });
  }
  const selected = providerId ?? (typeof error === "object" && error !== null && "providerId" in error ? (error as { providerId?: AIProviderId }).providerId : undefined);
  const label = selected ? PROVIDER_LABELS[selected] : "AI model service";
  const errorCategory = classifyProviderFailure(error);
  return NextResponse.json({
    error: safeProviderMessage(error, label),
    errorCategory,
  }, { status: safeStatusCode(error) });
}
