import { metaMuseSparkProvider } from "@/lib/ai/providers/meta";
import { createFireworksProvider } from "@/lib/ai/providers/fireworks";
import { createBasetenProvider } from "@/lib/ai/providers/baseten";
import { createModalProvider } from "@/lib/ai/providers/modal";
import { META_MUSE_MODEL, META_SAM_MODEL, PROVIDER_LABELS } from "@/lib/ai/models";
import { ProviderUnavailableError } from "@/lib/ai/errors";
import { readModelCheck } from "@/lib/ai/observability";
import { AI_PROVIDER_IDS } from "@/types/ai";
import type { AIConfiguration, AIProviderId, ModelAttribution, ProviderStatus, VisionProvider } from "@/types/ai";

const fireworksProvider = createFireworksProvider();
const basetenProvider = createBasetenProvider();

export function experimentationEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.MAJIPROOF_EXPERIMENTATION_ENABLED === "true";
}

function configuredProviderId(value: string | undefined, name: string, fallback: AIProviderId): AIProviderId {
  const normalized = value?.trim() || fallback;
  if (AI_PROVIDER_IDS.includes(normalized as AIProviderId)) return normalized as AIProviderId;
  throw new ProviderUnavailableError("meta", `${name} must be one of: ${AI_PROVIDER_IDS.join(", ")}.`);
}

function providerForId(providerId: AIProviderId): VisionProvider | undefined {
  switch (providerId) {
    case "meta": return metaMuseSparkProvider;
    case "fireworks": return fireworksProvider;
    case "baseten": return basetenProvider;
    case "modal": return createModalProvider();
  }
}

export function getAIConfiguration(): AIConfiguration {
  const primaryVisionProvider = configuredProviderId(process.env.MAJIPROOF_PRIMARY_VISION_PROVIDER, "MAJIPROOF_PRIMARY_VISION_PROVIDER", "meta");
  const selectedProvider = providerForId(primaryVisionProvider);
  const primaryVisionModel = process.env.MAJIPROOF_PRIMARY_VISION_MODEL?.trim() || selectedProvider?.model.modelId || "";
  const segmentationProvider = process.env.MAJIPROOF_SEGMENTATION_PROVIDER?.trim() || "meta";
  const segmentationModel = process.env.MAJIPROOF_SEGMENTATION_MODEL?.trim() || "sam-3.1";
  if (segmentationProvider !== "meta" || segmentationModel !== "sam-3.1") {
    throw new ProviderUnavailableError("meta", "Segmentation is explicitly configured for Meta SAM 3.1; unsupported provider/model changes are rejected without fallback.");
  }
  const experimentalProviderValue = process.env.MAJIPROOF_EXPERIMENTAL_PROVIDER?.trim();
  return {
    primaryVisionProvider,
    primaryVisionModel,
    segmentationProvider: "meta",
    segmentationModel: "sam-3.1",
    ...(experimentalProviderValue ? { experimentalProvider: configuredProviderId(experimentalProviderValue, "MAJIPROOF_EXPERIMENTAL_PROVIDER", "meta") } : {}),
    experimentationEnabled: experimentationEnabled(),
    allowExperimentalFieldProvider: process.env.MAJIPROOF_ALLOW_EXPERIMENTAL_FIELD_PROVIDER === "true",
  };
}

function modalDescriptor(): ModelAttribution | null {
  const modelId = process.env.MODAL_ENDPOINT_MODEL?.trim();
  if (!modelId) return null;
  return {
    providerId: "modal",
    modelId,
    variant: "muse-spark-open",
    displayName: "Modal Shared Endpoint · Muse Spark Open",
    endpointLabel: "Modal Shared Endpoint · project-hosted Chat Completions",
  };
}

export function getProviderStatuses(): ProviderStatus[] {
  const modalModel = modalDescriptor();
  const experimentalOn = experimentationEnabled();
  const modalImageVerified = process.env.MODAL_IMAGE_INPUT_VERIFIED === "true";
  const modalMissing = [
    ...(!process.env.MODAL_PROXY_TOKEN ? ["MODAL_PROXY_TOKEN"] : []),
    ...(!process.env.MODAL_ENDPOINT_MODEL ? ["MODAL_ENDPOINT_MODEL"] : []),
  ];
  const entries: Array<{ providerId: AIProviderId; model: ModelAttribution | null; configured: boolean; fieldDefault: boolean; reason?: string }> = [
    { providerId: "meta", model: META_MUSE_MODEL, configured: metaMuseSparkProvider.isConfigured(), fieldDefault: true },
    { providerId: "meta", model: META_SAM_MODEL, configured: Boolean(process.env.MODEL_API_KEY), fieldDefault: false, reason: "SAM 3.1 uses the separate segmentation route and is not a vision-workbench selection." },
    { providerId: "fireworks", model: fireworksProvider.model, configured: fireworksProvider.isConfigured(), fieldDefault: false, ...(!process.env.FIREWORKS_API_KEY ? { reason: "Add FIREWORKS_API_KEY through secure project settings to configure this provider." } : {}) },
    { providerId: "baseten", model: basetenProvider.model, configured: basetenProvider.isConfigured(), fieldDefault: false, ...(!process.env.BASETEN_API_KEY ? { reason: "Add BASETEN_API_KEY through secure project settings to configure this provider." } : {}) },
    {
      providerId: "modal",
      model: modalModel,
      configured: Boolean(process.env.MODAL_PROXY_TOKEN && process.env.MODAL_ENDPOINT_MODEL),
      fieldDefault: false,
      ...(modalMissing.length ? { reason: `Add ${modalMissing.join(" and ")} after creating an endpoint in the Modal workspace.` } : {}),
      ...(!modalMissing.length && !modalImageVerified ? { reason: "Confirm this project's endpoint image request example before enabling the adapter." } : {}),
    },
  ];

  return entries.map((entry) => {
    const checkKey = entry.model ? `${entry.model.providerId}:${entry.model.modelId}` : "modal:unconfigured-endpoint";
    const check = readModelCheck(checkKey);
    const verification = !check ? "not_yet_tested" : check.outcome === "success" ? "available" : "failed_health_check";
    const isSam = entry.model?.variant === "sam-3.1";
    const modalVerified = entry.providerId !== "modal" || modalImageVerified;
    const enabled = entry.configured && experimentalOn && modalVerified && !isSam;
    const reason = entry.reason ?? (!experimentalOn && !isSam ? "The development evaluation workbench is off by default; opt in with MAJIPROOF_EXPERIMENTATION_ENABLED=true." : undefined);
    return {
      providerId: entry.providerId,
      model: entry.model,
      configuration: entry.configured ? "configured" : "not_configured",
      verification,
      enabled,
      fieldDefault: entry.fieldDefault,
      ...(reason ? { reason } : {}),
      ...(check ? { lastCheck: check } : {}),
    } satisfies ProviderStatus;
  });
}

export function fieldVisionProvider(): VisionProvider {
  const configuration = getAIConfiguration();
  const provider = providerForId(configuration.primaryVisionProvider);
  if (!provider) throw new ProviderUnavailableError(configuration.primaryVisionProvider, "The configured primary provider has no project endpoint. No fallback was attempted.");
  if (provider.model.modelId !== configuration.primaryVisionModel) {
    throw new ProviderUnavailableError(provider.id, "The configured model identifier does not match the selected provider's verified model. No fallback was attempted.");
  }
  if (provider.id !== "meta" && !configuration.allowExperimentalFieldProvider) {
    throw new ProviderUnavailableError(provider.id, "Experimental providers are not enabled for ordinary field requests. Set MAJIPROOF_ALLOW_EXPERIMENTAL_FIELD_PROVIDER=true only after validation.");
  }
  if (!provider.isConfigured()) {
    const status = getProviderStatuses().find((item) => item.providerId === provider.id && item.model?.variant !== "sam-3.1");
    throw new ProviderUnavailableError(provider.id, status?.reason ?? `${PROVIDER_LABELS[provider.id]} is not configured. No fallback was attempted.`);
  }
  return provider;
}

export function explicitVisionProvider(providerId: AIProviderId, requestedModelId: string): VisionProvider {
  if (!experimentationEnabled()) {
    throw new ProviderUnavailableError(providerId, "Model evaluation is disabled. Enable MAJIPROOF_EXPERIMENTATION_ENABLED only in a development environment to run an explicit test.");
  }
  const provider = providerForId(providerId);
  if (!provider) throw new ProviderUnavailableError(providerId, "Modal has no configured project endpoint. Set MODAL_ENDPOINT_MODEL from the endpoint's own request example; the public model identifier is not a substitute.");
  if (provider.model.modelId !== requestedModelId) {
    throw new ProviderUnavailableError(providerId, "The requested model identifier does not match the selected provider configuration. No substitution was made.");
  }
  if (!provider.isConfigured()) {
    const status = getProviderStatuses().find((item) => item.providerId === providerId && item.model?.variant !== "sam-3.1");
    throw new ProviderUnavailableError(providerId, status?.reason ?? `${PROVIDER_LABELS[providerId]} is not configured. Add its server-side credential through secure project settings.`);
  }
  return provider;
}

export function allVisionProviders(): VisionProvider[] {
  return ["meta", "fireworks", "baseten", "modal"].flatMap((id) => {
    const provider = providerForId(id as AIProviderId);
    return provider ? [provider] : [];
  });
}

export const defaultVisionModel = META_MUSE_MODEL;
export const defaultSamModel = META_SAM_MODEL;
