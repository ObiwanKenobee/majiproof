import { afterEach, describe, expect, it, vi } from "vitest";
import { readModelCheck, recordModelCheck } from "@/lib/ai/observability";

afterEach(() => vi.unstubAllEnvs());

describe("model verification state", () => {
  it("marks availability only after an explicit successful inference check", () => {
    const key = "unit-test-only:model-observability";
    expect(readModelCheck(key)).toBeUndefined();
    recordModelCheck(key, "failed", "billing");
    expect(readModelCheck(key)).toMatchObject({ outcome: "failed", errorCategory: "billing" });
    recordModelCheck(key, "success");
    expect(readModelCheck(key)).toMatchObject({ outcome: "success" });
  });

  it("stores only the timestamp, outcome and safe category in a model check", () => {
    const safe = "UNIT_TEST_SAFE_CATEGORY";
    recordModelCheck("unit-test-only:safe-check", "failed", "authentication");
    const serialized = JSON.stringify(readModelCheck("unit-test-only:safe-check"));
    expect(serialized).toContain("authentication");
    expect(serialized).not.toContain("SENSITIVE_TEST_SENTINEL");
    expect(serialized).not.toContain(safe);
  });
});
