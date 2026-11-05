import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    modelConfigured: Boolean(process.env.MODEL_API_KEY),
    models: ["muse-spark-1.3", "sam-3.1"],
  });
}
