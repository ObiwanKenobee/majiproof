import OpenAI from "openai";
import type { ZodType } from "zod";
import { parseImageStream } from "@meta-sam/parser";
import { analysisSchema, comparisonSchema } from "@/lib/schemas";
import type { AnalysisOutput, ComparisonOutput } from "@/lib/schemas";
import type { SegmentArtifact } from "@/types/inspection";
import type { ProviderCall, TokenUsage } from "@/types/ai";
import { META_MUSE_MODEL } from "@/lib/ai/models";
import { analysisJsonSchema, comparisonJsonSchema } from "@/lib/ai/json-schemas";
import { buildAnalysisPrompt, buildComparisonPrompt, buildCorrectionPrompt, VISION_SAFETY_INSTRUCTIONS } from "@/lib/ai/prompts";
import { InvalidProviderOutputError, ProviderUnavailableError } from "@/lib/ai/errors";
import { normalizeSamRecords } from "@/lib/meta/sam-normalize";

const BASE_URL = "https://api.meta.ai/v1";

function metaClient(): OpenAI {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new ProviderUnavailableError("meta", "Meta Model API is not configured. Add MODEL_API_KEY through secure project settings.");
  return new OpenAI({ apiKey, baseURL: BASE_URL, timeout: 90_000, maxRetries: 0 });
}

function responseUsage(response: { usage?: unknown }): TokenUsage | undefined {
  if (typeof response.usage !== "object" || response.usage === null) return undefined;
  const usage = response.usage as { input_tokens?: unknown; output_tokens?: unknown; input_tokens_details?: { cached_tokens?: unknown } };
  if (typeof usage.input_tokens !== "number" || typeof usage.output_tokens !== "number") return undefined;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    ...(typeof usage.input_tokens_details?.cached_tokens === "number" ? { cachedInputTokens: usage.input_tokens_details.cached_tokens } : {}),
  };
}

function addUsage(left: TokenUsage | undefined, right: TokenUsage | undefined): TokenUsage | undefined {
  if (!left) return right;
  if (!right) return left;
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cachedInputTokens: (left.cachedInputTokens ?? 0) + (right.cachedInputTokens ?? 0),
  };
}

async function structuredResult<T>(options: {
  schemaName: string;
  schema: Record<string, unknown>;
  validate: ZodType<T>;
  userText: string;
  images: string[];
}): Promise<ProviderCall<T>> {
  const client = metaClient();
  let usage: TokenUsage | undefined;
  let providerRequestId: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const correction = attempt === 0 ? "" : `\n\n${buildCorrectionPrompt()}`;
    const content = [
      { type: "input_text" as const, text: `${options.userText}${correction}` },
      ...options.images.map((image_url) => ({ type: "input_image" as const, image_url, detail: "auto" as const })),
    ];
    const response = await client.responses.create({
      model: META_MUSE_MODEL.modelId,
      instructions: VISION_SAFETY_INSTRUCTIONS,
      input: [{ type: "message", role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          schema: options.schema,
          strict: true,
        },
      },
    });
    usage = addUsage(usage, responseUsage(response));
    providerRequestId = response.id;
    let parsed: unknown;
    try {
      if (!response.output_text?.trim()) throw new Error("Empty structured text.");
      parsed = JSON.parse(response.output_text);
    } catch {
      if (attempt === 0) continue;
      throw new InvalidProviderOutputError("meta");
    }
    const validated = options.validate.safeParse(parsed);
    if (validated.success) {
      return {
        data: validated.data,
        model: META_MUSE_MODEL,
        ...(usage ? { usage } : {}),
        ...(providerRequestId ? { providerRequestId } : {}),
        correctionAttempts: attempt,
      };
    }
  }
  throw new InvalidProviderOutputError("meta");
}

export function analyzeImage(imageDataUrl: string, stage: "before" | "after", description: string): Promise<ProviderCall<AnalysisOutput>> {
  return structuredResult({
    schemaName: "maji_visual_inspection",
    schema: analysisJsonSchema,
    validate: analysisSchema,
    images: [imageDataUrl],
    userText: buildAnalysisPrompt(stage, description),
  });
}

export function compareImages(options: {
  before: string;
  after: string;
  assetDescription: string;
  beforeFindings: string;
  afterFindings: string;
}): Promise<ProviderCall<ComparisonOutput>> {
  return structuredResult({
    schemaName: "maji_evidence_comparison",
    schema: comparisonJsonSchema,
    validate: comparisonSchema,
    images: [options.before, options.after],
    userText: buildComparisonPrompt(options),
  });
}

export async function segmentImage(imageDataUrl: string, prompt: string): Promise<SegmentArtifact[]> {
  const client = metaClient();
  const stream = await client.responses.create({
    model: "sam-3.1",
    input: [{
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: prompt.trim() },
        { type: "input_image", image_url: imageDataUrl, detail: "auto" },
      ],
    }],
    stream: true,
    metadata: { mask_encoding: "one_bit" },
  });
  const parsed = parseImageStream(stream);
  const result = await parsed.finalResult;
  if (result.outcome.status !== "completed") throw new Error("SAM segmentation stream ended before completion.");
  return normalizeSamRecords(result.records, prompt);
}
