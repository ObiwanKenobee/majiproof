import { OpenAICompatibleVisionProvider } from "@/lib/ai/providers/openai-compatible";

export function createModalProvider(): OpenAICompatibleVisionProvider | undefined {
  const endpointModel = process.env.MODAL_ENDPOINT_MODEL?.trim();
  const proxyToken = process.env.MODAL_PROXY_TOKEN;
  const imageInputVerified = process.env.MODAL_IMAGE_INPUT_VERIFIED === "true";
  if (!endpointModel || !proxyToken) return undefined;

  return new OpenAICompatibleVisionProvider({
    providerId: "modal",
    displayName: "Modal Shared Endpoint",
    endpointLabel: "Modal Shared Endpoint · project-hosted Chat Completions",
    modelId: endpointModel,
    baseURL: "https://inference.us-west.modal.direct/v1",
    apiKeyEnvName: "MODAL_PROXY_TOKEN",
    apiKey: () => process.env.MODAL_PROXY_TOKEN,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBase64Bytes: 100 * 1024 * 1024,
    imageInputVerified,
  });
}
