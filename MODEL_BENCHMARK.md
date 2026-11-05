# MajiProof model benchmark

## Current benchmark state

The benchmark manifest is intentionally unpopulated. `data/benchmark/manifest.template.json` declares ten available case slots and `records: []`; there are no supplied or permissioned benchmark photographs, human labels, model outputs, ratings, latency samples or costs in the dataset. Do not fill it with synthetic images or generated “example” results. No successful live Muse Spark or SAM request is recorded; the last Meta smoke requests returned HTTP 402 `billing_not_configured`. No Fireworks/Baseten account credentials or Modal project endpoint are configured, so partner live results are also absent.

This distinction matters: provider adapters and local schemas can be tested with mocks, but a mocked result is not a live benchmark measurement. A credential being present, a provider's public catalog, or a model's “configured” state does not establish a successful inference.

## Workbench workflow

Use `/developer/models` in a development environment. It is a developer tool, not ordinary field navigation. Choose either a photograph already saved to this browser or a temporary upload, set the evidence stage and optional description, then explicitly select one enabled provider/model and press **Run**. No model call occurs when the page loads. The application sends the photo only to that selected provider; it does not fan out or silently switch providers after failure.

For each run, the workbench records SHA-256 fingerprints of the image bytes and the shared analysis prompt. Runs are comparable only when both fingerprints match. Use the same photo, stage, description and prompt version for paired provider comparisons. The workbench stores validated output and permitted metadata in this browser; it does not add the raw photo to the benchmark log or the empty manifest automatically.

After reviewing the original photograph and normalized output, a human evaluator may save five 1–5 ratings with notes:

- **Visual accuracy:** Are statements supported by visible pixels in the selected photograph?
- **Evidence discipline:** Does the model separate observation from diagnosis and acknowledge uncertainty?
- **Structured-output quality:** Did output pass the shared schema, and are its fields useful and internally coherent?
- **Technician relevance:** Are observations and next steps relevant without overclaiming?
- **SAM-prompt relevance:** Would the proposed short object phrase direct a useful, separately executed SAM request?

These are human qualitative judgements, not ground-truth facts. Record disagreement and uncertainty in notes; do not collapse them into a fabricated automated accuracy score. SAM-prompt relevance is an assessment of the suggestion, not a SAM mask-quality measurement. Actual segmentation evaluation requires a real SAM response and separately reviewed annotation/ground truth.

## Measurements and reporting

Latency is the actual measured request round-trip time from the MajiProof server executor. Provider token usage is reported only if that provider returns usage for the request. Missing usage is unknown, not zero. The application currently does not derive a reliable invoice cost for an individual run. Provider list prices in [MODEL_PROVIDER_GUIDE.md](./MODEL_PROVIDER_GUIDE.md) are dated public estimates and must not be reported as invoice cost or a measured benchmark result. Provider queue time, network conditions, region, workload and account tier can affect latency and availability.

For any later benchmark report, identify the benchmark cases and permitted image source, exact provider and model IDs, prompt/version, run date, number of successful/failed requests, measurement basis and any missing provider usage. Summarize each human rating dimension separately. Do not state a “best model” without representative, labelled cases and repeatable results; do not infer overall model superiority from one photograph or one successful request.

## Dataset contribution format

Before populating a slot, obtain permission to use the real photograph and store it through the project's approved dataset process. Do not put sensitive personal data, precise location or identifying metadata in a benchmark case. A case needs the fields listed in `data/benchmark/manifest.template.json`: a stable image reference, before/after stage, prompt version, requested provider/model identity, human labels and human ratings. The stored human label should describe only directly observable attributes and include disagreement/unknown labels where appropriate. Keep original image access separate from public documentation and code history.

The ten-slot manifest is a schema/template, not a dataset or evidence of tests. It can be expanded to 10–20 real, independently reviewed inspection examples once appropriate imagery and permissioned labels exist. Never commit real field photographs or sensitive labels merely to make the benchmark appear populated.

## Repeatability checklist

1. Select one non-sensitive, permissioned image and use the same stage and context for each provider run.
2. Confirm the displayed fingerprints match before treating outputs as a pair.
3. Run only explicitly selected, configured providers. Respect endpoint access, image limits and usage costs.
4. Save the actual normalized output and executor measurements; retain sanitized provider errors for failures.
5. Have an evaluator compare each output against the photo and score each criterion independently.
6. Report only measured facts and manual assessments, with missing results and limitations disclosed.
