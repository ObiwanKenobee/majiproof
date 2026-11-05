import { NextResponse } from "next/server";
import { imageSize } from "image-size";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

export { MAX_IMAGE_BYTES };
const allowedMimeTypes = new Set<string>(ALLOWED_IMAGE_TYPES);
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES * 2 + 512 * 1024;
const MIME_BY_IMAGE_SIZE_TYPE: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const requestWindows = new Map<string, { startedAt: number; count: number }>();

export type ValidatedImage = { bytes: Buffer; mimeType: string; width: number; height: number };
export type ImageValidationResult = { ok: true; image: ValidatedImage } | { ok: false; error: string };

export async function validateImage(file: FormDataEntryValue | null, field: string): Promise<ImageValidationResult> {
  const label = field === "before" ? "Before-repair" : field === "after" ? "After-repair" : "Inspection";
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: `Choose a ${label.toLowerCase()} photograph to continue.` };
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: `${label} exceeds the 8 MB per-photo limit.` };
  if (!allowedMimeTypes.has(file.type)) return { ok: false, error: `${label} must be a JPEG, PNG or WebP image.` };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const size = imageSize(bytes);
    const mimeType = MIME_BY_IMAGE_SIZE_TYPE[size.type ?? ""];
    if (!mimeType || !allowedMimeTypes.has(mimeType) || mimeType !== file.type) {
      return { ok: false, error: `${label} content must match a valid JPEG, PNG or WebP image.` };
    }
    const { width, height } = size;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return { ok: false, error: `${label} could not be read. Choose another photograph.` };
    }
    if (width > 12_000 || height > 12_000 || width * height > 50_000_000) {
      return { ok: false, error: `${label} exceeds the safe image-dimension limit (50 megapixels; 12,000 pixels per side).` };
    }
    return { ok: true, image: { bytes, mimeType, width, height } };
  } catch {
    return { ok: false, error: `${label} is not a readable JPEG, PNG or WebP image.` };
  }
}

export function rateLimit(request: Request, route: string): NextResponse | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${route}:${forwarded || "local"}`;
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 12;
  const entry = requestWindows.get(key);
  if (!entry || now - entry.startedAt >= windowMs) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return null;
  }
  entry.count += 1;
  if (entry.count <= limit) return null;
  return NextResponse.json(
    { error: "Too many model requests in a short period. Wait a minute, then try again." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}

export async function readMultipartForm(request: Request): Promise<FormData | NextResponse | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return null;
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (contentLengthHeader && (!Number.isSafeInteger(contentLength) || contentLength < 0)) return null;
  if (contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json({ error: "Upload request exceeds the supported multi-photo size limit." }, { status: 413 });
  }
  try { return await request.formData(); }
  catch { return null; }
}

export function unavailableModelResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "The model service could not complete this request.";
  const providerError = typeof error === "object" && error !== null ? error as { status?: unknown; code?: unknown; type?: unknown } : {};
  const status = typeof providerError.status === "number" ? providerError.status : undefined;
  const safeCode = typeof providerError.code === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(providerError.code) ? providerError.code : undefined;
  const safeType = typeof providerError.type === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(providerError.type) ? providerError.type : undefined;
  if (status || safeCode || safeType) console.error("Meta Model API failure", JSON.stringify({ status, code: safeCode, type: safeType }));
  if (message === "MODEL_API_KEY_MISSING") {
    return NextResponse.json(
      { error: "Meta Model API is not configured yet. Add MODEL_API_KEY in project settings, then retry. Your uploaded evidence remains saved on this device." },
      { status: 503 },
    );
  }
  const actionable = status === 401 || status === 403
    ? "Meta Model API rejected the configured credential. Check access to the Meta Model API, update the protected server-side key, then retry. Your evidence remains saved."
    : status === 402
      ? "Meta Model API reports billing_not_configured. Enable provider billing and model access on the Meta API account, then retry. No results were created; your evidence remains saved on this device."
    : status === 404
      ? "The Meta Model API could not find this endpoint or model for the configured account. Check provider access and model availability, then retry. Your evidence remains saved."
      : status === 429
        ? "Meta Model API rate limit or usage quota was reached. Wait or check provider usage, then retry. Your evidence remains saved."
        : status && status >= 400 && status < 500
          ? "Meta Model API rejected this request. Check model access and image format, then retry. Your evidence remains saved."
          : "Meta Model API could not complete the request. Your evidence remains saved; check the model key and connection, then retry.";
  return NextResponse.json(
    { error: actionable },
    { status: 502 },
  );
}
