import { describe, expect, it } from "vitest";
import { ProviderUnavailableError } from "@/lib/ai/errors";
import { providerErrorResponse } from "@/lib/ai/http";

describe("provider-unavailable API responses", () => {
  it("returns an actionable 503 without serializing any credential value or provider body", async () => {
    const secretSentinel = "NEVER_SERIALIZE_THIS_PROVIDER_KEY";
    const error = new ProviderUnavailableError("fireworks", "Fireworks is not configured. Add FIREWORKS_API_KEY through secure settings.");
    const response = providerErrorResponse(error, "fireworks");
    const payload = await response.json() as { error: string; errorCategory: string };
    expect(response.status).toBe(503);
    expect(payload.errorCategory).toBe("configuration");
    expect(payload.error).toContain("FIREWORKS_API_KEY");
    expect(JSON.stringify(payload)).not.toContain(secretSentinel);
  });
});


describe("provider error redaction", () => {
  it("does not echo raw provider exceptions that may contain secret data", async () => {
    const secretSentinel = "provider-secret-value-must-not-appear";
    const rawError = Object.assign(new Error(secretSentinel), { status: 503 });
    const response = providerErrorResponse(rawError, "baseten");
    const payload = await response.json() as { error: string; errorCategory: string };

    expect(response.status).toBe(502);
    expect(payload.errorCategory).toBe("provider_error");
    expect(JSON.stringify(payload)).not.toContain(secretSentinel);
    expect(payload.error).toContain("Baseten");
  });
});
