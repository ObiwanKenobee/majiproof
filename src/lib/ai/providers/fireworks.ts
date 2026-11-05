import { OpenAICompatibleVisionProvider } from "@/lib/ai/providers/openai-compatible";

export function createFireworksProvider(): OpenAICompatibleVisionProvider {
  return new OpenAICompatibleVisionProvider({
    providerId: "fireworks",
    displayName: "Fireworks AI",
    endpointLabel: "Fireworks Inference API · Chat Completions",
    modelId: "accounts/fireworks/models/muse-spark-open",
    baseURL: "https://api.fireworks.ai/inference/v1",
    apiKeyEnvName: "FIREWORKS_API_KEY",
    apiKey: () => process.env.FIREWORKS_API_KEY,
    allowedMimeTypes: ["image/jpeg", "image/png"],
    maxBase64Bytes: 10_000_000,
  });
}
