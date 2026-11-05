import type { EvidenceWithBlob, HumanReview, VisualComparison } from "@/types/inspection";

export function isReviewCurrent(
  review: HumanReview | undefined,
  evidence: EvidenceWithBlob[],
  comparison: VisualComparison | undefined,
): boolean {
  if (!review?.evidenceIds || typeof review.comparisonSnapshot !== "string") return false;
  const currentEvidenceIds = evidence
    .filter((item) => item.stage === "before" || item.stage === "after")
    .map((item) => item.id)
    .sort();
  const reviewedEvidenceIds = [...review.evidenceIds].sort();
  return currentEvidenceIds.length === reviewedEvidenceIds.length
    && currentEvidenceIds.every((id, index) => id === reviewedEvidenceIds[index])
    && review.comparisonSnapshot === JSON.stringify(comparison ?? null);
}
