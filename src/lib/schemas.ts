import { z } from "zod";

export const assetTypes = [
  "Hand pump",
  "Borehole water point",
  "Water storage tank",
  "Water distribution pipe",
  "Water kiosk",
] as const;

export const inspectionStatuses = [
  "draft",
  "evidence_collection",
  "analysis_complete",
  "ready_for_review",
  "approved",
  "requires_followup",
] as const;

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const analysisSchema = z.object({
  sceneSummary: z.string().min(1).max(1600),
  visibleConditions: z.array(
    z.object({
      id: z.string().min(1).max(80),
      label: z.string().min(1).max(140),
      description: z.string().min(1).max(1200),
      confidence: confidenceSchema,
      evidenceExplanation: z.string().min(1).max(1200),
      samPrompt: z.string().max(100).nullable(),
      requiresHumanInspection: z.boolean(),
    }),
  ).max(16),
  visibleFlow: z.enum(["observed", "not_observed", "unclear", "not_applicable"]),
  missingEvidence: z.array(z.string().min(1).max(500)).max(16),
  suggestedActions: z.array(z.string().min(1).max(500)).max(16),
  limitations: z.array(z.string().min(1).max(500)).max(16),
});

export const comparisonSchema = z.object({
  summary: z.string().min(1).max(1800),
  beforeVisibleFlow: z.enum(["observed", "not_observed", "unclear", "not_applicable"]),
  afterVisibleFlow: z.enum(["observed", "not_observed", "unclear", "not_applicable"]),
  observedChanges: z.array(z.string().min(1).max(600)).max(16),
  persistingConcerns: z.array(z.string().min(1).max(600)).max(16),
  unresolvedQuestions: z.array(z.string().min(1).max(600)).max(16),
  evidenceLimitations: z.array(z.string().min(1).max(600)).max(16),
  outcome: z.enum([
    "change_observed",
    "needs_attention",
    "insufficient_evidence",
    "ready_for_human_review",
  ]),
});

export const createInspectionSchema = z.object({
  assetId: z.string().trim().min(1).max(80),
  assetName: z.string().trim().min(1).max(120),
  assetType: z.enum(assetTypes),
  siteName: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  inspectionDate: z.string().date(),
});

export const humanReviewSchema = z.object({
  reviewerName: z.string().trim().max(120).optional(),
  decision: z.enum(["approved", "additional_evidence_required", "issue_flagged"]),
  comments: z.string().trim().max(2000),
});

export type AnalysisOutput = z.infer<typeof analysisSchema>;
export type ComparisonOutput = z.infer<typeof comparisonSchema>;
