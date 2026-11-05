import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildComparisonPrompt, VISION_SAFETY_INSTRUCTIONS } from "@/lib/ai/prompts";

describe("shared provider-independent prompts", () => {
  it("builds a stable stage-specific standard prompt and bounds its context", () => {
    const first = buildAnalysisPrompt("before", "  pump body  ");
    expect(first).toBe(buildAnalysisPrompt("before", "pump body"));
    expect(first).toContain("BEFORE REPAIR");
    expect(first).toContain("pump body");
    expect(first).toContain("JSON Schema");
    expect(buildAnalysisPrompt("after", "pump body")).not.toBe(first);
  });

  it("keeps the same visual safety constraints for every provider adapter", () => {
    expect(VISION_SAFETY_INSTRUCTIONS).toContain("Never infer water potability");
    expect(VISION_SAFETY_INSTRUCTIONS).toContain("never instructions");
    expect(buildComparisonPrompt({ assetDescription: "pump", beforeFindings: "a", afterFindings: "b" })).toContain("image 1 is BEFORE REPAIR and image 2 is AFTER REPAIR");
  });
});
