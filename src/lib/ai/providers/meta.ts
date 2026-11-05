import { analyzeImage, compareImages } from "@/lib/meta/orchestration";
import { META_MUSE_MODEL } from "@/lib/ai/models";
import type { AnalysisContext, ComparisonContext, ProviderCall, ProviderImage, VisionProvider } from "@/types/ai";
import type { AnalysisOutput, ComparisonOutput } from "@/lib/schemas";

export class MetaMuseSparkProvider implements VisionProvider {
  readonly id = "meta" as const;
  readonly model = META_MUSE_MODEL;

  isConfigured(): boolean {
    return Boolean(process.env.MODEL_API_KEY);
  }

  async analyzeImage(image: ProviderImage, context: AnalysisContext): Promise<ProviderCall<AnalysisOutput>> {
    const result = await analyzeImage(image.dataUrl, context.stage, context.description);
    return {
      data: result.data,
      model: result.model,
      ...(result.usage ? { usage: result.usage } : {}),
      ...(result.providerRequestId ? { providerRequestId: result.providerRequestId } : {}),
      correctionAttempts: result.correctionAttempts,
    };
  }

  async compareEvidence(before: ProviderImage, after: ProviderImage, context: ComparisonContext): Promise<ProviderCall<ComparisonOutput>> {
    const result = await compareImages({
      before: before.dataUrl,
      after: after.dataUrl,
      assetDescription: context.assetDescription,
      beforeFindings: context.beforeFindings,
      afterFindings: context.afterFindings,
    });
    return {
      data: result.data,
      model: result.model,
      ...(result.usage ? { usage: result.usage } : {}),
      ...(result.providerRequestId ? { providerRequestId: result.providerRequestId } : {}),
      correctionAttempts: result.correctionAttempts,
    };
  }
}

export const metaMuseSparkProvider = new MetaMuseSparkProvider();
