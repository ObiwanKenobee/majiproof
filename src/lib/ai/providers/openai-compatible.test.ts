import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSdk = vi.hoisted(() => ({ queue: [] as unknown[], requests: [] as unknown[], configs: [] as unknown[] }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: (request: unknown) => {
      mockSdk.requests.push(request);
      return { withResponse: async () => {
        const fixture = mockSdk.queue.shift() as { data?: unknown; headers?: Record<string, string>; error?: unknown } | undefined;
        if (!fixture) throw new Error("No mocked response fixture was queued.");
        if (fixture.error) throw fixture.error;
        return { data: fixture.data, response: { headers: new Headers(fixture.headers ?? {}) } };
      } };
    } } };
    constructor(configuration: unknown) { mockSdk.configs.push(configuration); }
  },
}));

import { InvalidProviderOutputError } from "@/lib/ai/errors";
import { OpenAICompatibleVisionProvider } from "@/lib/ai/providers/openai-compatible";
import type { ComparisonOutput, AnalysisOutput } from "@/lib/schemas";

const validAnalysis: AnalysisOutput = {
  sceneSummary: "A hand pump is visible.", visibleConditions: [], visibleFlow: "unclear", missingEvidence: [], suggestedActions: [], limitations: ["The image is not a water-quality test."],
};
const validComparison: ComparisonOutput = {
  summary: "Visible differences are unclear.", beforeVisibleFlow: "unclear", afterVisibleFlow: "unclear", observedChanges: [], persistingConcerns: [], unresolvedQuestions: [], evidenceLimitations: ["The images do not verify engineering performance."], outcome: "insufficient_evidence",
};

function provider(apiKey: string = "unit-test-only-key", allowedMimeTypes: string[] = ["image/png"]) {
  return new OpenAICompatibleVisionProvider({
    providerId: "fireworks", displayName: "Fireworks AI", endpointLabel: "Fireworks Inference API · Chat Completions",
    modelId: "accounts/fireworks/models/muse-spark-open", baseURL: "https://api.fireworks.ai/inference/v1",
    apiKeyEnvName: "FIREWORKS_API_KEY", apiKey: () => apiKey, allowedMimeTypes, maxBase64Bytes: 10_000_000,
  });
}
function image(overrides: Partial<{ dataUrl: string; mimeType: string; byteLength: number }> = {}) {
  return { dataUrl: "data:image/png;base64,AA==", mimeType: "image/png", byteLength: 1, ...overrides };
}
function completion(content: string, usage = true) {
  return { data: { id: "provider-request-123", choices: [{ message: { content } }], ...(usage ? { usage: { prompt_tokens: 120, completion_tokens: 40, prompt_tokens_details: { cached_tokens: 20 } } } : {}) }, headers: { "x-request-id": "request-header-123" } };
}

beforeEach(() => { mockSdk.queue.length = 0; mockSdk.requests.length = 0; mockSdk.configs.length = 0; });

describe("OpenAI-compatible Muse Spark Open adapters", () => {
  it("normalizes a successful analysis, model attribution, request ID and provider usage", async () => {
    mockSdk.queue.push(completion(JSON.stringify(validAnalysis)));
    const result = await provider().analyzeImage(image(), { stage: "before", description: "pump housing" });
    expect(result.data.sceneSummary).toContain("hand pump");
    expect(result.model.modelId).toBe("accounts/fireworks/models/muse-spark-open");
    expect(result.model.variant).toBe("muse-spark-open");
    expect(result.model.endpointLabel).toContain("Fireworks");
    expect(result.providerRequestId).toBe("request-header-123");
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 40, cachedInputTokens: 20 });
    const request = mockSdk.requests[0] as { model: string; response_format: { type: string }; messages: Array<{ content: unknown }> };
    expect(request.model).toBe("accounts/fireworks/models/muse-spark-open");
    expect(request.response_format.type).toBe("json_object");
    expect(mockSdk.configs).toContainEqual(expect.objectContaining({ maxRetries: 0, timeout: 90_000 }));
    expect(JSON.stringify(request.messages)).toContain("data:image/png;base64,AA==");
  });

  it("retries exactly once only to correct locally invalid provider JSON", async () => {
    mockSdk.queue.push(completion("not json", false), completion(JSON.stringify(validAnalysis), false));
    const result = await provider().analyzeImage(image(), { stage: "after", description: "" });
    expect(result.correctionAttempts).toBe(1);
    expect(mockSdk.requests).toHaveLength(2);
    const corrective = mockSdk.requests[1] as { messages: Array<{ content: Array<{ text?: string }> }> };
    expect(corrective.messages[1].content[0].text).toContain("previous response did not pass");
  });

  it("fails after the single correction attempt and never invents a normalized result", async () => {
    mockSdk.queue.push(completion("{}", false), completion("still invalid", false));
    await expect(provider().analyzeImage(image(), { stage: "before", description: "" })).rejects.toBeInstanceOf(InvalidProviderOutputError);
    expect(mockSdk.requests).toHaveLength(2);
  });

  it("uses the same comparison schema for both image parts", async () => {
    mockSdk.queue.push(completion(JSON.stringify(validComparison)));
    const result = await provider().compareEvidence(image(), image({ dataUrl: "data:image/png;base64,BB==" }), { assetDescription: "hand pump", beforeFindings: "before note", afterFindings: "after note" });
    expect(result.data.outcome).toBe("insufficient_evidence");
    const request = mockSdk.requests[0] as { messages: Array<{ content: Array<{ type: string; image_url?: { url: string } }> }> };
    expect(request.messages[1].content.filter((part) => part.type === "image_url")).toHaveLength(2);
    expect(request.messages[1].content[1].image_url?.url).toBe("data:image/png;base64,AA==");
    expect(request.messages[1].content[2].image_url?.url).toBe("data:image/png;base64,BB==");
  });

  it("rejects unsupported image MIME and oversized encoded payload before constructing an SDK request", async () => {
    await expect(provider().analyzeImage(image({ mimeType: "image/webp" }), { stage: "before", description: "" })).rejects.toMatchObject({ status: 415 });
    await expect(provider().analyzeImage(image({ byteLength: 8_000_001 }), { stage: "before", description: "" })).rejects.toMatchObject({ status: 413 });
    expect(mockSdk.requests).toHaveLength(0);
  });

  it("keeps an adapter unavailable without its own provider credential", async () => {
    const unconfigured = provider("");
    expect(unconfigured.isConfigured()).toBe(false);
    await expect(unconfigured.analyzeImage(image(), { stage: "before", description: "" })).rejects.toMatchObject({ providerId: "fireworks" });
    expect(mockSdk.requests).toHaveLength(0);
  });
});
