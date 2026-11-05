export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sceneSummary", "visibleConditions", "visibleFlow", "missingEvidence", "suggestedActions", "limitations"],
  properties: {
    sceneSummary: { type: "string" },
    visibleConditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "description", "confidence", "evidenceExplanation", "samPrompt", "requiresHumanInspection"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          evidenceExplanation: { type: "string" },
          samPrompt: { type: ["string", "null"] },
          requiresHumanInspection: { type: "boolean" },
        },
      },
    },
    visibleFlow: { type: "string", enum: ["observed", "not_observed", "unclear", "not_applicable"] },
    missingEvidence: { type: "array", items: { type: "string" } },
    suggestedActions: { type: "array", items: { type: "string" } },
    limitations: { type: "array", items: { type: "string" } },
  },
} as const;

export const comparisonJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "beforeVisibleFlow", "afterVisibleFlow", "observedChanges", "persistingConcerns", "unresolvedQuestions", "evidenceLimitations", "outcome"],
  properties: {
    summary: { type: "string" },
    beforeVisibleFlow: { type: "string", enum: ["observed", "not_observed", "unclear", "not_applicable"] },
    afterVisibleFlow: { type: "string", enum: ["observed", "not_observed", "unclear", "not_applicable"] },
    observedChanges: { type: "array", items: { type: "string" } },
    persistingConcerns: { type: "array", items: { type: "string" } },
    unresolvedQuestions: { type: "array", items: { type: "string" } },
    evidenceLimitations: { type: "array", items: { type: "string" } },
    outcome: { type: "string", enum: ["change_observed", "needs_attention", "insufficient_evidence", "ready_for_human_review"] },
  },
} as const;
