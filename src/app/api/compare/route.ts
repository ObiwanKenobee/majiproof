import { NextResponse } from "next/server";
import { z } from "zod";
import { fieldVisionProvider } from "@/lib/ai/registry";
import { executeModelCall } from "@/lib/ai/execute";
import { toProviderImage } from "@/lib/ai/image-input";
import { providerErrorResponse } from "@/lib/ai/http";
import { rateLimit, readMultipartForm, validateImage } from "@/lib/server-security";

export const runtime = "nodejs";
export const maxDuration = 120;

const contextSchema = z.string().trim().max(2400);
const inspectionIdSchema = z.string().trim().max(100).optional();

export async function POST(request: Request) {
  const limited = rateLimit(request, "compare");
  if (limited) return limited;
  try {
    const provider = fieldVisionProvider();
    const multipart = await readMultipartForm(request);
    if (multipart instanceof NextResponse) return multipart;
    if (!multipart) return NextResponse.json({ error: "Submit both photographs as valid multipart form data." }, { status: 400 });
    const form = multipart;
    const before = await validateImage(form.get("before"), "before");
    if (!before.ok) return NextResponse.json({ error: before.error }, { status: 400 });
    const after = await validateImage(form.get("after"), "after");
    if (!after.ok) return NextResponse.json({ error: after.error }, { status: 400 });
    const assetDescription = contextSchema.safeParse(String(form.get("assetDescription") ?? ""));
    const beforeFindings = contextSchema.safeParse(String(form.get("beforeFindings") ?? ""));
    const afterFindings = contextSchema.safeParse(String(form.get("afterFindings") ?? ""));
    const inspectionId = inspectionIdSchema.safeParse(form.get("inspectionId") || undefined);
    if (!assetDescription.success || !beforeFindings.success || !afterFindings.success || !inspectionId.success) {
      return NextResponse.json({ error: "Inspection context or ID is invalid or exceeds the allowed length." }, { status: 400 });
    }

    const { call, inference } = await executeModelCall({
      providerId: provider.id,
      model: provider.model,
      operation: "comparison",
      promptVersion: "comparison-v1",
      ...(inspectionId.data ? { inspectionId: inspectionId.data } : {}),
      call: () => provider.compareEvidence(toProviderImage(before.image), toProviderImage(after.image), {
        assetDescription: assetDescription.data,
        beforeFindings: beforeFindings.data,
        afterFindings: afterFindings.data,
      }),
    });
    return NextResponse.json({
      comparison: { ...call.data, attribution: provider.model },
      model: provider.model,
      inference,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
