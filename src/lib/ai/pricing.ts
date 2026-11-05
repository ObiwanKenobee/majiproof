import type { AIProviderId, TokenUsage } from "@/types/ai";

export interface PublicListRate {
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion: number;
  outputUsdPerMillion: number;
  documentedAt: string;
}

const DOCUMENTATION_DATE = "2026-11-04";
const listRates: Partial<Record<AIProviderId, PublicListRate>> = {
  fireworks: { inputUsdPerMillion: 1.25, cachedInputUsdPerMillion: 0.15, outputUsdPerMillion: 4.25, documentedAt: DOCUMENTATION_DATE },
  baseten: { inputUsdPerMillion: 1.25, cachedInputUsdPerMillion: 0.15, outputUsdPerMillion: 4.25, documentedAt: DOCUMENTATION_DATE },
  modal: { inputUsdPerMillion: 1.25, cachedInputUsdPerMillion: 0.15, outputUsdPerMillion: 4.25, documentedAt: DOCUMENTATION_DATE },
};

export function estimateListCost(providerId: AIProviderId, usage: TokenUsage): number | undefined {
  const rate = listRates[providerId];
  if (!rate) return undefined;
  const cached = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const uncached = Math.max(0, usage.inputTokens - cached);
  const total = (uncached * rate.inputUsdPerMillion + cached * rate.cachedInputUsdPerMillion + usage.outputTokens * rate.outputUsdPerMillion) / 1_000_000;
  return Number(total.toFixed(8));
}

export function getListRateDate(providerId: AIProviderId): string | undefined {
  return listRates[providerId]?.documentedAt;
}
