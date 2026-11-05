import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { imageSize } from "image-size";
import { allVisionProviders } from "@/lib/ai/registry";
import { safeProviderMessage } from "@/lib/ai/errors";
import { PROVIDER_LABELS } from "@/lib/ai/models";
import { segmentImage } from "@/lib/meta/orchestration";

const imagePath = process.env.MAJIPROOF_SMOKE_IMAGE_PATH;
const providers = allVisionProviders().filter((provider) => provider.isConfigured());
const enabled = process.env.MAJIPROOF_RUN_LIVE_SMOKE === "true" && Boolean(imagePath) && providers.length > 0;
const samEnabled = process.env.MAJIPROOF_RUN_LIVE_SAM_SMOKE === "true" && Boolean(imagePath) && Boolean(process.env.MODEL_API_KEY);

async function operatorSelectedImage() {
  if (!imagePath) throw new Error("Set MAJIPROOF_SMOKE_IMAGE_PATH to a user-selected local photograph.");
  const bytes = await readFile(imagePath);
  if (bytes.length > 8 * 1024 * 1024) throw new Error("The selected smoke image exceeds MajiProof's 8 MB per-photo limit.");
  const dimensions = imageSize(bytes);
  const mimeType = dimensions.type === "jpg" ? "image/jpeg" : dimensions.type ? `image/${dimensions.type}` : "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) throw new Error("The operator-selected smoke image does not have a supported JPEG, PNG or WebP signature.");
  if (dimensions.width > 12_000 || dimensions.height > 12_000 || dimensions.width * dimensions.height > 50_000_000) throw new Error("The smoke image exceeds the decoded-resolution boundary.");
  return { dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`, mimeType, byteLength: bytes.length };
}

describe.skipIf(!enabled)("explicitly opted-in live provider smoke tests", () => {
  for (const provider of providers) {
    it(`validates a real ${PROVIDER_LABELS[provider.id]} response independently`, async () => {
      try {
        const image = await operatorSelectedImage();
        const result = await provider.analyzeImage(image, { stage: "before", description: "Opt-in smoke test. Report only directly visible observations and uncertainty." });
        expect(result.data.sceneSummary.length).toBeGreaterThan(0);
        expect(result.model.providerId).toBe(provider.id);
      } catch (error) {
        throw new Error(safeProviderMessage(error, PROVIDER_LABELS[provider.id]));
      }
    }, 120_000);
  }
});

describe.skipIf(!samEnabled)("independently opted-in Meta SAM 3.1 live smoke test", () => {
  it("returns only parser-decoded SAM results or a legitimate empty list", async () => {
    const image = await operatorSelectedImage();
    const result = await segmentImage(image.dataUrl, "water pump");
    expect(Array.isArray(result)).toBe(true);
  }, 120_000);
});
