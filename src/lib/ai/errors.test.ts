import { describe, expect, it } from "vitest";
import { classifyProviderFailure, safeProviderMessage, safeStatusCode } from "@/lib/ai/errors";

const credentialSentinel = "TEST_ONLY_SECRET_SHOULD_NEVER_LEAK";

describe("provider error handling", () => {
  it.each([[402, "billing"], [401, "authentication"], [403, "access"], [404, "model_unavailable"], [413, "payload_limit"], [429, "rate_limit"]] as const)("maps HTTP %i to a safe category", (status, category) => {
    expect(classifyProviderFailure(Object.assign(new Error(`${credentialSentinel} private upstream body`), { status }))).toBe(category);
  });

  it("shows a bounded actionable message and does not echo an upstream body or credential", () => {
    const raw = Object.assign(new Error(`Authorization ${credentialSentinel}: private provider body`), { status: 402 });
    const message = safeProviderMessage(raw, "Test provider");
    expect(message).toContain("billing or model access");
    expect(message).not.toContain(credentialSentinel);
    expect(message).not.toContain("private provider body");
    expect(safeStatusCode(raw)).toBe(402);
  });
});
