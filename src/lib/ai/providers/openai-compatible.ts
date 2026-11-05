import OpenAI from "openai";
import { analysisSchema, comparisonSchema, type AnalysisOutput, type ComparisonOutput } from "@/lib/schemas";
import { buildAnalysisPrompt, buildComparisonPrompt, buildCorrectionPrompt, VISION_SAFETY_INSTRUCTIONS } from "@/lib/ai/prompts";
import { InvalidProviderOutputError, ProviderUnavailableError } from "@/lib/ai/errors";
import type { AnalysisContext, ComparisonContext, ProviderCall, ProviderImage, TokenUsage, VisionProvider, VisionModelVariant } from "@/types/ai";
import type { AIProviderId, ModelAttribution } from "@/types/ai";

export interface CompatibleProviderConfig {
  providerId: Exclude<AIProviderId, "meta">;
  displayName: string;
  endpointLabel: string;
  modelId: string;
  baseURL: string;
  apiKeyEnvName: string;
  apiKey: () => string | undefined;
  allowedMimeTypes: readonly string[];
  maxBase64Bytes: number;
  imageInputVerified?: boolean;
}

function sumUsage(left: TokenUsage | undefined, right: TokenUsage | undefined): TokenUsage | undefined {
  if (!left) return right;
  if (!right) return left;
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cachedInputTokens: (left.cachedInputTokens ?? 0) + (right.cachedInputTokens ?? 0),
  };
}

function toUsage(completion: OpenAI.Chat.Completions.ChatCompletion): TokenUsage | undefined {
  const usage = completion.usage;
  if (!usage) return undefined;
  const cached = usage.prompt_tokens_details?.cached_tokens;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    ...(typeof cached === "number" ? { cachedInputTokens: cached } : {}),
  };
}

function messageText(content: string | Array<{ type: string; text?: string }> | null): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.flatMap((part) => part.type === "text" && part.text ? [part.text] : []).join("\n");
  return "";
}

export class OpenAICompatibleVisionProvider implements VisionProvider {
  readonly id: CompatibleProviderConfig["providerId"];
  readonly model: ModelAttribution;
  private readonly config: CompatibleProviderConfig;

  constructor(config: CompatibleProviderConfig) {
    this.config = config;
    this.id = config.providerId;
    this.model = {
      providerId: config.providerId,
      modelId: config.modelId,
      variant: "muse-spark-open" satisfies VisionModelVariant,
      displayName: `${config.displayName} · Muse Spark Open`,
      endpointLabel: config.endpointLabel,
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey()) && this.config.imageInputVerified !== false;
  }

  private client(): OpenAI {
    if (!this.config.apiKey()) throw new ProviderUnavailableError(this.id, `${this.config.displayName} is not configured. Add ${this.config.apiKeyEnvName} through secure project settings.`);
    if (this.config.imageInputVerified === false) throw new ProviderUnavailableError(this.id, `${this.config.displayName} image request format has not been verified for this project's endpoint; the adapter remains disabled.`);
    return new OpenAI({
      apiKey: this.config.apiKey()!,
      baseURL: this.config.baseURL,
      timeout: 90_000,
      maxRetries: 0,
    });
  }

  private validateImages(images: ProviderImage[]): void {
    if (images.some((image) => !this.config.allowedMimeTypes.includes(image.mimeType.toLowerCase()))) {
      const error = new Error(`${this.config.displayName} does not accept one of these image formats.`) as Error & { status: number };
      error.status = 415;
      throw error;
    }
    const base64Bytes = images.reduce((total, image) => total + Math.ceil(image.byteLength / 3) * 4, 0);
    if (base64Bytes > this.config.maxBase64Bytes) {
      const error = new Error(`${this.config.displayName} image payload exceeds its documented limit.`) as Error & { status: number };
      error.status = 413;
      throw error;
    }
  }

  private async structured<T>(options: {
    prompt: string;
    images: ProviderImage[];
    schema: typeof analysisSchema | typeof comparisonSchema;
    operation: "analysis" | "comparison";
  }): Promise<ProviderCall<T>> {
    this.validateImages(options.images);
    const client = this.client();
    let usage: TokenUsage | undefined;
    let providerRequestId: string | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const prompt = attempt === 0 ? options.prompt : `${options.prompt}\n\n${buildCorrectionPrompt()}`;
      const request = client.chat.completions.create({
        model: this.model.modelId,
        temperature: 0.1,
        max_tokens: 2600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VISION_SAFETY_INSTRUCTIONS },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...options.images.map((image) => ({ type: "image_url" as const, image_url: { url: image.dataUrl, detail: "auto" as const } })),
            ],
          },
        ],
      });
      const { data, response } = await request.withResponse();
      usage = sumUsage(usage, toUsage(data));
      providerRequestId = response.headers.get("x-request-id") ?? data.id ?? providerRequestId;
      const raw = messageText(data.choices[0]?.message.content ?? null);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        if (attempt === 0) continue;
        throw new InvalidProviderOutputError(this.id);
      }
      const result = options.schema.safeParse(parsed);
      if (result.success) {
        return {
          data: result.data as T,
          model: this.model,
          ...(usage ? { usage } : {}),
          ...(providerRequestId ? { providerRequestId } : {}),
          correctionAttempts: attempt,
        };
      }
      if (attempt === 1) throw new InvalidProviderOutputError(this.id);
    }
    throw new InvalidProviderOutputError(this.id);
  }

  analyzeImage(image: ProviderImage, context: AnalysisContext): Promise<ProviderCall<AnalysisOutput>> {
    return this.structured<AnalysisOutput>({
      operation: "analysis",
      prompt: buildAnalysisPrompt(context.stage, context.description),
      images: [image],
      schema: analysisSchema,
    });
  }

  compareEvidence(before: ProviderImage, after: ProviderImage, context: ComparisonContext): Promise<ProviderCall<ComparisonOutput>> {
    return this.structured<ComparisonOutput>({
      operation: "comparison",
      prompt: buildComparisonPrompt(context),
      images: [before, after],
      schema: comparisonSchema,
    });
  }
}
