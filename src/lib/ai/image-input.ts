import type { ProviderImage } from "@/types/ai";
import type { ValidatedImage } from "@/lib/server-security";

export function toProviderImage(image: ValidatedImage): ProviderImage {
  return {
    dataUrl: `data:${image.mimeType};base64,${image.bytes.toString("base64")}`,
    mimeType: image.mimeType,
    byteLength: image.bytes.byteLength,
  };
}
