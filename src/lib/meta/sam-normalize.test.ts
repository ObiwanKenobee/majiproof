import { beforeEach, describe, expect, it, vi } from "vitest";

const parserFixtures = vi.hoisted(() => ({ boxes: [] as unknown[], masks: [] as unknown[], decode: vi.fn(() => new Uint8Array([0, 255, 255, 0])) }));
vi.mock("@meta-sam/parser", () => ({
  recordsOfKind: (_records: unknown, kind: string) => kind === "box" ? parserFixtures.boxes : parserFixtures.masks,
  decodeMaskToRaster: parserFixtures.decode,
}));

import { normalizeSamRecords } from "@/lib/meta/sam-normalize";

beforeEach(() => { parserFixtures.boxes = []; parserFixtures.masks = []; parserFixtures.decode.mockClear(); });

describe("official SAM parser result normalization", () => {
  it("pairs parser-emitted boxes with decoded real-mask rasters and preserves the prompt", () => {
    parserFixtures.boxes = [{ objectId: "obj-1", left: 0.1, top: 0.2, right: 0.8, bottom: 0.9 }];
    parserFixtures.masks = [{ objectId: "obj-1", bounds: { left: 1, top: 2, right: 2, bottom: 3 }, mask: { width: 2, height: 2 }, confidence: 0.94 }];
    const results = normalizeSamRecords([] as never, "pump handle");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ prompt: "pump handle", objectId: "obj-1", maskWidth: 2, maskHeight: 2, maskRasterBase64: "AP//AA==", confidence: 0.94 });
    expect(results[0].box).toEqual({ left: 0.1, top: 0.2, right: 0.8, bottom: 0.9 });
    expect(parserFixtures.decode).toHaveBeenCalledTimes(1);
  });

  it("returns no artifact for an unmatched mask or no mask record", () => {
    parserFixtures.boxes = [];
    parserFixtures.masks = [{ objectId: "unmatched", bounds: { left: 0, top: 0, right: 1, bottom: 1 }, mask: { width: 2, height: 2 } }];
    expect(normalizeSamRecords([] as never, "pump handle")).toEqual([]);
    expect(parserFixtures.decode).not.toHaveBeenCalled();
    parserFixtures.masks = [];
    expect(normalizeSamRecords([] as never, "pump handle")).toEqual([]);
  });
});
