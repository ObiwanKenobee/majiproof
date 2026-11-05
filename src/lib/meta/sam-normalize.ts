import { decodeMaskToRaster, recordsOfKind } from "@meta-sam/parser";
import type { SegmentArtifact } from "@/types/inspection";

export function normalizeSamRecords(records: Parameters<typeof recordsOfKind>[0], prompt: string): SegmentArtifact[] {
  const boxes = recordsOfKind(records, "box");
  const masks = recordsOfKind(records, "mask");
  return masks.flatMap((mask, index) => {
    const box = boxes.find((item) => item.objectId === mask.objectId);
    if (!box) return [];
    const raster = decodeMaskToRaster(mask.mask);
    return [{
      id: `${mask.objectId}-${index}-${Date.now()}`,
      prompt,
      objectId: mask.objectId,
      box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
      bounds: { left: mask.bounds.left, top: mask.bounds.top, right: mask.bounds.right, bottom: mask.bounds.bottom },
      maskWidth: mask.mask.width,
      maskHeight: mask.mask.height,
      maskRasterBase64: Buffer.from(raster).toString("base64"),
      ...(mask.confidence === undefined ? {} : { confidence: mask.confidence }),
    } satisfies SegmentArtifact];
  });
}
