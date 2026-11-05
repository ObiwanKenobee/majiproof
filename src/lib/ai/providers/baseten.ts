import { OpenAICompatibleVisionProvider } from "@/lib/ai/providers/openai-compatible";

export function createBasetenProvider(): OpenAICompatibleVisionProvider {
  return new OpenAICompatibleVisionProvider({
    providerId: "baseten",
    displayName: "Baseten",
    endpointLabel: "Baseten Model API · Chat Completions",
    modelId: "meta-models/muse-spark-open",
    baseURL: "https://inference.baseten.co/v1",
    apiKeyEnvName: "BASETEN_API_KEY",
    apiKey: () => process.env.BASETEN_API_KEY,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBase64Bytes: 100 * 1024 * 1024,
  });
}
