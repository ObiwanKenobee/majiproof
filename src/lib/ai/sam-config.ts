import { getAIConfiguration } from "@/lib/ai/registry";
import { META_SAM_MODEL } from "@/lib/ai/models";
import { ProviderUnavailableError } from "@/lib/ai/errors";

export function assertMetaSamConfiguration(): void {
  const configuration = getAIConfiguration();
  if (configuration.segmentationProvider !== META_SAM_MODEL.providerId || configuration.segmentationModel !== META_SAM_MODEL.modelId) {
    throw new ProviderUnavailableError("meta", "SAM segmentation is configured for Meta SAM 3.1 only. No alternate segmentation provider was selected.");
  }
}
