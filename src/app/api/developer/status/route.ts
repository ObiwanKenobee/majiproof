import { NextResponse } from "next/server";
import { inferenceCapacitySnapshot } from "@/lib/ai/concurrency";
import { experimentationEnabled, getProviderStatuses } from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Developer diagnostics are unavailable outside a development environment." }, { status: 404 });
  return NextResponse.json({
    providers: getProviderStatuses(),
    experimentationEnabled: experimentationEnabled(),
    concurrency: inferenceCapacitySnapshot(),
    statusScope: "Provider verification is per application process. Credentials indicate configuration only, not successful access.",
    logScope: "Detailed inference logs are stored locally in the current browser; images and full prompts are not included.",
  }, { headers: { "Cache-Control": "no-store" } });
}
