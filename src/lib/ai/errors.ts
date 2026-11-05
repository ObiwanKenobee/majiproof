import type { AIProviderId, ProviderFailureCategory } from "@/types/ai";

export class ProviderUnavailableError extends Error {
  readonly category: ProviderFailureCategory = "configuration";
  constructor(readonly providerId: AIProviderId, message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class InvalidProviderOutputError extends Error {
  readonly category: ProviderFailureCategory = "invalid_output";
  constructor(readonly providerId: AIProviderId) {
    super("The provider returned content that did not pass the application's inspection schema after one correction attempt.");
    this.name = "InvalidProviderOutputError";
  }
}

function numericStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function classifyProviderFailure(error: unknown): ProviderFailureCategory {
  if (error instanceof ProviderUnavailableError) return "configuration";
  if (error instanceof InvalidProviderOutputError) return "invalid_output";
  if (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "InferenceCapacityError") return "rate_limit";
  if (error instanceof Error && /timeout|timed out|aborted/i.test(error.name + " " + error.message)) return "timeout";
  const status = numericStatus(error);
  if (status === 402) return "billing";
  if (status === 401) return "authentication";
  if (status === 403) return "access";
  if (status === 404) return "model_unavailable";
  if (status === 413) return "payload_limit";
  if (status === 429) return "rate_limit";
  if (status && status >= 400 && status < 500) return "request_rejected";
  return "provider_error";
}

export function safeProviderMessage(error: unknown, providerLabel: string): string {
  if (error instanceof ProviderUnavailableError) return error.message;
  if (error instanceof InvalidProviderOutputError) return error.message;
  if (error instanceof Error && error.name === "InferenceCapacityError") return error.message;
  const category = classifyProviderFailure(error);
  switch (category) {
    case "billing": return `${providerLabel} rejected inference because billing or model access is not enabled for this account.`;
    case "authentication": return `${providerLabel} did not accept its server-side credential. Check the configured key securely.`;
    case "access": return `${providerLabel} denied access to the requested model or endpoint.`;
    case "model_unavailable": return `${providerLabel} could not find this model for the configured account or endpoint.`;
    case "rate_limit": return `${providerLabel} rate limit or local inference capacity was reached. No automatic retry was made; wait before trying again.`;
    case "payload_limit": return `${providerLabel} rejected the image because it exceeds the documented request limit.`;
    case "timeout": return `${providerLabel} did not finish before the request timeout. Evidence remains saved; retry only if needed.`;
    case "configuration": return `${providerLabel} is not configured. Add the required credential through secure project settings.`;
    case "invalid_output": return `${providerLabel} returned structured content that could not be validated.`;
    case "request_rejected": return `${providerLabel} rejected the request. Check the image format and provider-specific limits.`;
    default: return `${providerLabel} inference failed. Check provider access and server logs for the safe error category.`;
  }
}

export function safeStatusCode(error: unknown): number {
  if (error instanceof ProviderUnavailableError) return 503;
  if (error instanceof InvalidProviderOutputError) return 502;
  if (error instanceof Error && error.name === "InferenceCapacityError") return 503;
  const status = numericStatus(error);
  if (status === 402) return 402;
  if (status === 401 || status === 403) return 503;
  if (status === 404) return 502;
  if (status === 413) return 413;
  if (status === 429) return 429;
  if (status === 415) return 400;
  if (status && status >= 400 && status < 500) return 400;
  return 502;
}
