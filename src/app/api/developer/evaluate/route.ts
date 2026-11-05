import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { developerEvaluationInputSchema } from "@/lib/ai/schemas";
import { experimentationEnabled, explicitVisionProvider } from "@/lib/ai/registry";
import { getProviderStatuses } from "@/lib/ai/registry";
import { executeModelCall } from "@/lib/ai/execute";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";
import { toProviderImage } from "@/lib/ai/image-input";
import { providerErrorResponse } from "@/lib/ai/http";
import { readMultipartForm, rateLimit, validateImage } from "@/lib/server-security";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Model evaluation is available only in a development environment." }, { status: 404 });
  if (!experimentationEnabled()) return NextResponse.json({ error: "Experiments are disabled. Set MAJIPROOF_EXPERIMENTATION_ENABLED=true in the development environment to opt in." }, { status: 403 });
  const limited = rateLimit(request, "developer-evaluate");
  if (limited) return limited;

  const multipart = await readMultipartForm(request);
  if (multipart instanceof NextResponse) return multipart;
  if (!multipart) return NextResponse.json({ error: "Upload a valid multipart image request." }, { status: 400 });
  const form = multipart;
  const parsed = developerEvaluationInputSchema.safeParse({
    providerId: form.get("providerId"),
    modelId: form.get("modelId"),
    benchmarkRunId: form.get("benchmarkRunId"),
    stage: form.get("stage"),
    description: form.get("description") ?? "",
    inspectionId: form.get("inspectionId") || undefined,
    imageFingerprint: form.get("imageFingerprint"),
    promptFingerprint: form.get("promptFingerprint"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Provider, stage, prompt and image fingerprints must be valid." }, { status: 400 });
  const validation = await validateImage(form.get("image"), parsed.data.stage);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const actualImageFingerprint = createHash("sha256").update(validation.image.bytes).digest("hex");
  const actualPromptFingerprint = createHash("sha256").update(buildAnalysisPrompt(parsed.data.stage, parsed.data.description)).digest("hex");
  if (actualImageFingerprint !== parsed.data.imageFingerprint.toLowerCase() || actualPromptFingerprint !== parsed.data.promptFingerprint.toLowerCase()) {
    return NextResponse.json({ error: "The selected image or repeatable prompt changed before the request. Re-select the evidence and retry." }, { status: 400 });
  }

  const providerId = parsed.data.providerId;
  const configuredModel = getProviderStatuses().find((entry) => entry.providerId === providerId && entry.model?.variant !== "sam-3.1")?.model;
  if (!configuredModel || configuredModel.modelId !== parsed.data.modelId) {
    return NextResponse.json({ error: "The selected model is not available for this provider. No substitution was made." }, { status: 400 });
  }
  try {
    const image = toProviderImage(validation.image);
    const { call, inference } = await executeModelCall({
      providerId,
      model: configuredModel,
      operation: "benchmark-analysis",
      stage: parsed.data.stage,
      promptVersion: "inspection-v1",
      benchmarkRunId: parsed.data.benchmarkRunId,
      ...(parsed.data.inspectionId ? { inspectionId: parsed.data.inspectionId } : {}),
      call: () => {
        const provider = explicitVisionProvider(providerId, parsed.data.modelId);
        return provider.analyzeImage(image, { stage: parsed.data.stage, description: parsed.data.description });
      },
    });
    return NextResponse.json({ analysis: call.data, inference, imageFingerprint: actualImageFingerprint, promptFingerprint: actualPromptFingerprint }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error, providerId);
  }
}
