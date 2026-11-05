import { afterEach, describe, expect, it, vi } from "vitest";
import { explicitVisionProvider, fieldVisionProvider, getAIConfiguration, getProviderStatuses } from "@/lib/ai/registry";
import { createModalProvider } from "@/lib/ai/providers/modal";

afterEach(() => vi.unstubAllEnvs());

describe("explicit AI model routing", () => {
  it("keeps Meta Muse Spark 1.3 and Meta SAM 3.1 as the separate field defaults", () => {
    vi.stubEnv("MODEL_API_KEY", "unit-test-meta-credential");
    vi.stubEnv("MAJIPROOF_PRIMARY_VISION_PROVIDER", "meta");
    vi.stubEnv("MAJIPROOF_PRIMARY_VISION_MODEL", "muse-spark-1.3");
    vi.stubEnv("MAJIPROOF_SEGMENTATION_PROVIDER", "meta");
    vi.stubEnv("MAJIPROOF_SEGMENTATION_MODEL", "sam-3.1");
    const configuration = getAIConfiguration();
    expect(configuration.primaryVisionProvider).toBe("meta");
    expect(configuration.primaryVisionModel).toBe("muse-spark-1.3");
    expect(configuration.segmentationProvider).toBe("meta");
    expect(configuration.segmentationModel).toBe("sam-3.1");
    expect(fieldVisionProvider().model.modelId).toBe("muse-spark-1.3");
  });

  it("does not silently use Meta when an explicitly selected partner has no credential", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MODEL_API_KEY", "unit-test-meta-credential");
    vi.stubEnv("FIREWORKS_API_KEY", "");
    vi.stubEnv("MAJIPROOF_PRIMARY_VISION_PROVIDER", "fireworks");
    vi.stubEnv("MAJIPROOF_PRIMARY_VISION_MODEL", "accounts/fireworks/models/muse-spark-open");
    vi.stubEnv("MAJIPROOF_ALLOW_EXPERIMENTAL_FIELD_PROVIDER", "true");
    expect(() => fieldVisionProvider()).toThrow(/FIREWORKS_API_KEY/);
    expect(getProviderStatuses().find((item) => item.providerId === "meta" && item.model?.variant === "muse-spark-1.3")?.fieldDefault).toBe(true);
  });

  it("rejects unsupported model substitution and keeps experiment requests disabled by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MAJIPROOF_EXPERIMENTATION_ENABLED", "false");
    expect(() => explicitVisionProvider("meta", "muse-spark-open")).toThrow(/disabled/);
    vi.stubEnv("MAJIPROOF_EXPERIMENTATION_ENABLED", "true");
    vi.stubEnv("MODEL_API_KEY", "unit-test-meta-credential");
    expect(() => explicitVisionProvider("meta", "muse-spark-open")).toThrow(/match the selected provider/);
  });

  it("keeps Modal safely disabled until the project image-request contract is explicitly verified", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MAJIPROOF_EXPERIMENTATION_ENABLED", "true");
    vi.stubEnv("MODAL_PROXY_TOKEN", "unit-test-modal-token");
    vi.stubEnv("MODAL_ENDPOINT_MODEL", "endpoint-host-from-example");
    vi.stubEnv("MODAL_IMAGE_INPUT_VERIFIED", "false");
    expect(createModalProvider()?.isConfigured()).toBe(false);
    const modal = getProviderStatuses().find((item) => item.providerId === "modal");
    expect(modal?.configuration).toBe("configured");
    expect(modal?.enabled).toBe(false);
    expect(modal?.reason).toMatch(/image request example/);
  });

  it("returns status without serializing any configured secret value", () => {
    const sentinel = "NO_SECRET_VALUE_IN_STATUS_JSON";
    vi.stubEnv("MODEL_API_KEY", sentinel);
    const status = JSON.stringify(getProviderStatuses());
    expect(status).not.toContain(sentinel);
    expect(status).toContain("not_yet_tested");
  });
});
