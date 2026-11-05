import { NextResponse } from "next/server";
import { z } from "zod";
import { segmentImage } from "@/lib/meta/orchestration";
import { defaultSamModel } from "@/lib/ai/registry";
import { executeModelCall } from "@/lib/ai/execute";
import { toProviderImage } from "@/lib/ai/image-input";
import { providerErrorResponse } from "@/lib/ai/http";
import { assertMetaSamConfiguration } from "@/lib/ai/sam-config";
import { rateLimit, readMultipartForm, validateImage } from "@/lib/server-security";
import type { SegmentArtifact } from "@/types/inspection";

export const runtime = "nodejs";
export const maxDuration = 120;

const segmentationInput = z.object({ prompt: z.string().trim().min(2).max(100) });
const inspectionIdSchema = z.string().trim().max(100).optional();
const stageSchema = z.enum(["before", "after"]);

export async function POST(request: Request) {
  const limited = rateLimit(request, "segment");
  if (limited) return limited;
  try {
    const multipart = await readMultipartForm(request);
    if (multipart instanceof NextResponse) return multipart;
    if (!multipart) return NextResponse.json({ error: "Submit the photograph and prompt as a valid multipart request." }, { status: 400 });
    const form = multipart;
    const uploaded = await validateImage(form.get("image"), "image");
    if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 400 });
    const input = segmentationInput.safeParse({ prompt: form.get("prompt") });
    if (!input.success) return NextResponse.json({ error: "Enter a short object label." }, { status: 400 });
    const stage = stageSchema.safeParse(form.get("stage"));
    if (!stage.success) return NextResponse.json({ error: "Choose BEFORE REPAIR or AFTER REPAIR for this photo." }, { status: 400 });
    if (input.data.prompt.split(/\s+/).length > 6 || /[<>\n\r]/.test(input.data.prompt)) {
      return NextResponse.json({ error: "SAM prompts must be a short noun phrase such as ‘pump handle’." }, { status: 400 });
    }
    const inspectionId = inspectionIdSchema.safeParse(form.get("inspectionId") || undefined);
    if (!inspectionId.success) return NextResponse.json({ error: "Inspection ID is invalid." }, { status: 400 });
    const providerImage = toProviderImage(uploaded.image);
    const { call, inference } = await executeModelCall({
      providerId: "meta",
      model: defaultSamModel,
      operation: "segmentation",
      stage: stage.data,
      promptVersion: "sam-noun-v1",
      ...(inspectionId.data ? { inspectionId: inspectionId.data } : {}),
      resultCount: (items) => items.length,
      call: async () => {
        assertMetaSamConfiguration();
        return {
          data: await segmentImage(providerImage.dataUrl, input.data.prompt) as SegmentArtifact[],
          model: defaultSamModel,
        };
      },
    });
    return NextResponse.json({
      segmentations: call.data,
      prompt: input.data.prompt,
      imageWidth: uploaded.image.width,
      imageHeight: uploaded.image.height,
      model: defaultSamModel,
      inference,
      noMatches: call.data.length === 0,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error, "meta");
  }
}
