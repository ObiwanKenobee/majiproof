export type AssetType =
  | "Hand pump"
  | "Borehole water point"
  | "Water storage tank"
  | "Water distribution pipe"
  | "Water kiosk";

export type InspectionStatus =
  | "draft"
  | "evidence_collection"
  | "analysis_complete"
  | "ready_for_review"
  | "approved"
  | "requires_followup";

export type EvidenceStage = "before" | "after";
export type Confidence = "high" | "medium" | "low";

export interface InspectionCase {
  id: string;
  assetId: string;
  assetName: string;
  assetType: AssetType;
  siteName: string;
  stage: EvidenceStage;
  region?: string;
  inspectionDate: string;
  createdAt: string;
  updatedAt: string;
  status: InspectionStatus;
}

export interface EvidenceRecord {
  id: string;
  inspectionId: string;
  stage: EvidenceStage;
  fileName: string;
  mimeType: string;
  createdAt: string;
  description?: string;
}

export interface VisualCondition {
  id: string;
  label: string;
  description: string;
  confidence: Confidence;
  evidenceExplanation: string;
  samPrompt: string | null;
  requiresHumanInspection: boolean;
}

export interface AIAnalysis {
  sceneSummary: string;
  visibleConditions: VisualCondition[];
  visibleFlow: "observed" | "not_observed" | "unclear" | "not_applicable";
  missingEvidence: string[];
  suggestedActions: string[];
  limitations: string[];
  attribution?: ModelAttribution;
}

export interface SegmentBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SegmentArtifact {
  id: string;
  prompt: string;
  objectId: string;
  box: SegmentBox;
  bounds: SegmentBox;
  maskWidth: number;
  maskHeight: number;
  maskRasterBase64: string;
  confidence?: number;
}

export interface SegmentAttempt {
  prompt: string;
  noMatches: boolean;
  completedAt: string;
}

export interface EvidenceWithBlob extends EvidenceRecord {
  blob: Blob;
  analysis?: AIAnalysis;
  segmentations?: SegmentArtifact[];
  segmentAttempts?: SegmentAttempt[];
  comparison?: VisualComparison;
}

export interface VisualComparison {
  summary: string;
  beforeVisibleFlow: "observed" | "not_observed" | "unclear" | "not_applicable";
  afterVisibleFlow: "observed" | "not_observed" | "unclear" | "not_applicable";
  observedChanges: string[];
  persistingConcerns: string[];
  unresolvedQuestions: string[];
  evidenceLimitations: string[];
  outcome:
    | "change_observed"
    | "needs_attention"
    | "insufficient_evidence"
    | "ready_for_human_review";
  attribution?: ModelAttribution;
}

export interface HumanReview {
  id: string;
  inspectionId: string;
  evidenceIds?: string[];
  comparisonSnapshot?: string;
  reviewerName?: string;
  decision: "approved" | "additional_evidence_required" | "issue_flagged";
  comments: string;
  reviewedAt: string;
}

export interface InspectionBundle {
  inspection: InspectionCase;
  evidence: EvidenceWithBlob[];
  comparison?: VisualComparison;
  review?: HumanReview;
}

export interface StoredEvidence extends EvidenceRecord {
  blob: Blob;
  analysis?: AIAnalysis;
  segmentations?: SegmentArtifact[];
  segmentAttempts?: SegmentAttempt[];
  comparison?: VisualComparison;
}
import type { ModelAttribution } from "@/types/ai";
