import { NextResponse } from "next/server";
import { z } from "zod";
import { fieldVisionProvider } from "@/lib/ai/registry";
import { executeModelCall } from "@/lib/ai/execute";
import { toProviderImage } from "@/lib/ai/image-input";
import { providerErrorResponse } from "@/lib/ai/http";
import { rateLimit, readMultipartForm, validateImage } from "@/lib/server-security";

export const runtime = "nodejs";
export const maxDuration = 120;

const stageSchema = z.enum(["before", "after"]);
const noteSchema = z.string().trim().max(800);
const inspectionIdSchema = z.string().trim().max(100).optional();

export async function POST(request: Request) {
  const limited = rateLimit(request, "analyze");
  if (limited) return limited;
  try {
    const provider = fieldVisionProvider();
    const multipart = await readMultipartForm(request);
    if (multipart instanceof NextResponse) return multipart;
    if (!multipart) return NextResponse.json({ error: "Submit the photograph as a valid multipart image upload." }, { status: 400 });
    const form = multipart;
    const uploaded = await validateImage(form.get("image"), "image");
    if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 400 });
    const stage = stageSchema.safeParse(form.get("stage"));
    if (!stage.success) return NextResponse.json({ error: "Choose BEFORE REPAIR or AFTER REPAIR." }, { status: 400 });
    const note = noteSchema.safeParse(String(form.get("description") ?? ""));
    if (!note.success) return NextResponse.json({ error: "The field note must be 800 characters or fewer." }, { status: 400 });
    const inspectionId = inspectionIdSchema.safeParse(form.get("inspectionId") || undefined);
    if (!inspectionId.success) return NextResponse.json({ error: "Inspection ID is invalid." }, { status: 400 });

    const image = toProviderImage(uploaded.image);
    const { call, inference } = await executeModelCall({
      providerId: provider.id,
      model: provider.model,
      operation: "analysis",
      stage: stage.data,
      promptVersion: "inspection-v1",
      ...(inspectionId.data ? { inspectionId: inspectionId.data } : {}),
      call: () => provider.analyzeImage(image, { stage: stage.data, description: note.data }),
    });
    return NextResponse.json({
      analysis: { ...call.data, attribution: provider.model },
      model: provider.model,
      inference,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
