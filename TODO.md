# MajiProof delivery outcomes

Status: ☐ open · ☑ complete only when the behavior is implemented and supported by project evidence.

Current validation record (5 November 2026): `pnpm test` passes with 35 tests; the two explicitly opt-in live tests are skipped in the ordinary run. `pnpm typecheck` and `pnpm build` pass. Host-managed diagnostics are registered for TypeScript, JavaScript, JSON, CSS and HTML. Every declared page route returns HTTP 200, `/manus-routes.json` returns the source-matching route set as valid JSON, and `/api/health` reports that the server-side model key is present. Server validation rejected MIME-spoofed content, a 60-megapixel image and malformed multipart input with HTTP 400, and rejected an over-limit multipart body with HTTP 413. The last recorded live Meta requests returned HTTP 402 `billing_not_configured`; no new live provider calls or model output were created during this validation. Successful live Muse/SAM inference, partner access and benchmark measurements remain unverified. Vercel deployment credentials are unavailable; no publish was attempted. Dashboard activity is a latest-update-per-case summary, not a full audit trail.

## 1. Application foundation and navigation — ☐
- [x] Application starts successfully.
- [x] TypeScript builds without errors.
- [x] No broken primary navigation; all declared page routes and the dynamic workspace return HTTP 200.
- [ ] Responsive layout works.
- [x] Implement a responsive interface.
- [x] Provide accessible labels, keyboard navigation, loading states, empty states and error messages.
- [x] Support desktop inspection dashboards, tablets used by field supervisors, and mobile phones used by field workers.
- [x] Main navigation: Overview, Inspections, New Inspection, Reports, Settings.
- [x] Dashboard: recent inspection cases, cases awaiting review, cases requiring follow-up, inspection activity and quick action to create inspection.
- [x] All dashboard statistics derive from actual persisted records. Do not populate fabricated operational metrics.

## 2. Inspection case records and local persistence — ☐
- [ ] Inspection records can be created and reopened.
- [ ] The field worker can create an inspection record containing Asset ID, asset name, asset type, site or community name, county or region (optional), inspection date and inspection stage.
- [ ] Supported initial asset types: Hand pump; Borehole water point; Water storage tank; Water distribution pipe; Water kiosk.
- [ ] Do not require GPS coordinates or personal information.
- [ ] Use IndexedDB for inspection metadata and image blobs; use local browser storage for lightweight preferences; no compulsory account creation; preserve records across ordinary browser refreshes.
- [ ] Structure the storage layer so Supabase can be added later.
- [ ] Use data contracts with inspection statuses draft, evidence_collection, analysis_complete, ready_for_review, approved and requires_followup; evidence stages before/after; and separate human decisions approved, additional_evidence_required and issue_flagged.

## 3. Evidence capture and stage handling — ☐
- [ ] Photographs can be uploaded.
- [x] Invalid file types are rejected, including uploaded content whose actual image signature does not match its declared MIME type.
- [x] File sizes are validated server-side, per photo and for the multipart request body.
- [ ] Image previews work.
- [ ] Before and after evidence remain distinguishable.
- [ ] Allow users to upload photographs, preview them, remove and replace uploaded evidence, add a written description and identify the inspection stage as BEFORE REPAIR.
- [ ] Support JPEG, PNG and WebP images.
- [ ] Provide drag-and-drop and mobile camera upload support.
- [ ] Allow a second image upload identified as AFTER REPAIR.
- [ ] Run the same visual-analysis and segmentation workflow on after-repair evidence and display new observations separately from original findings.
- [x] Set an initial image limit of 8 MB per photograph.
- [x] Decode uploaded images in the browser and reject images above 50 megapixels or 12,000 pixels on either side; server model routes independently verify supported file signatures, MIME agreement and header dimensions.

## 4. Muse Spark visual inspection — ☐
- [ ] Muse Spark 1.3 responds successfully when configured.
- [ ] Structured analysis is validated.
- [ ] Missing or malformed model responses are handled.
- [ ] Send uploaded evidence to Muse Spark 1.3 using the Responses API and image input blocks.
- [ ] Extract infrastructure description; visible components; observable conditions; potential defects; visible leakage, where present; visible water flow, where present; possible maintenance concerns; missing evidence; uncertainty and limitations; and suggested next inspection actions.
- [ ] Each finding includes finding ID, observation, evidence explanation, confidence category High/Medium/Low, whether further human inspection is necessary, and suggested visual segmentation prompt.
- [ ] Do not confuse visual observation with engineering diagnosis. Muse Spark must not infer water potability from appearance.
- [ ] Require JSON structured results and validate model output with Zod before using it. If parsing fails, retry once with explicit correction; if it still fails, return a visible error instead of inventing results.
- [ ] If Muse Spark succeeds but SAM fails, preserve the analysis and explain that segmentation is unavailable.

## 5. SAM 3.1 segmentation and actual overlays — ☐
- [ ] SAM 3.1 responds successfully when configured.
- [ ] Masks and bounding boxes render correctly.
- [ ] Empty segmentation responses are handled.
- [ ] Integrate Meta's Segment Anything Model 3.1; use visual reasoning from Muse Spark to determine relevant objects.
- [ ] Send original image and a concrete short noun segmentation prompt to SAM 3.1 via Responses API.
- [ ] Use the official `@meta-sam/parser` package to parse segmentation results; do not manually parse SAM's custom token grammar.
- [ ] Display original photograph, highlighted object, actual segmentation mask, bounding box and selected object label.
- [ ] Let users toggle the segmentation overlay.
- [ ] Handle empty segmentation responses gracefully and show that no matching objects were detected.
- [ ] Do not fabricate masks if segmentation fails.
- [ ] Limit the first version to one or two useful segmentation prompts per image to manage latency and API consumption.

## 6. Before-and-after comparison — ☐
- [ ] Both images are submitted to the comparison workflow.
- [ ] The model identifies observable differences.
- [ ] Uncertainty is communicated.
- [ ] No automatic repair certification occurs.
- [ ] Send both photographs to Muse Spark with their corresponding inspection records.
- [ ] Compare observable differences; components that appear to have changed; visible defects that appear reduced or remain present; evidence of visible water flow if observable; inconclusive observations; missing evidence; and further inspection requirements.
- [ ] Result categories are CHANGE OBSERVED, NEEDS ATTENTION, INSUFFICIENT EVIDENCE and READY FOR HUMAN REVIEW.
- [ ] An AI observation that water appears to flow does not establish water supply capacity, reliability, cleanliness or potability.
- [ ] Do not automatically mark an asset as repaired or verified.

## 7. Human supervisor review — ☐
- [ ] A supervisor can review the results.
- [ ] Human decisions are recorded separately.
- [ ] Reviewer sees asset information, before and after photographs, AI observations, segmentation overlays, comparison results, missing evidence and confidence categories.
- [ ] Reviewer can approve the evidence for the recorded inspection, request additional evidence, flag unresolved issues, add comments and record a manual verification decision.
- [ ] Human decisions remain separate from AI-generated conclusions.
- [ ] Allow approval only after both before/after photographs have been compared.
- [ ] Bind each saved human decision to the evidence IDs and comparison snapshot reviewed; retain but mark the decision as prior/historical if those inputs change.

## 8. PDF reporting — ☐
- [ ] PDF reports can be generated.
- [ ] Reports include the actual evidence and limitations.
- [ ] Create a professional downloadable PDF containing MajiProof branding, inspection identification, asset information, date and location description, before-and-after photographs, annotated evidence where available, AI-generated observations, segmentation findings, comparison summary, confidence and limitations, recommended follow-up actions, human reviewer comments and approval status.
- [ ] The report clearly identifies AI-generated content and human-confirmed decisions.
- [ ] Distinguish a current human decision from a prior decision tied to changed evidence or a changed comparison; include separate before/after photographed-flow observations with a visual-only limitation.

## 9. Security, reliability and no-fabrication boundaries — ☐
- [ ] API failures never produce fabricated results.
- [x] Implement server-side API key protection, file-type validation, file-size limits, input validation, error handling, request timeouts, basic request throttling, safe handling of model responses and clear loading/retry states.
- [x] Never expose the Meta API key through browser code or a `NEXT_PUBLIC_` environment variable.
- [ ] Do not persist sensitive information unnecessarily; do not require exact location or personal identity.
- [ ] Do not make unsupported claims about water safety, pump functionality, infrastructure reliability or engineering diagnoses.
- [x] Treat uploaded evidence as untrusted data, not instructions to the AI system.
- [x] Do not automatically mark maintenance work complete.
- [x] Explicitly distinguish what the image shows, what the model infers, what remains unknown and what a human has approved.
- [x] If both models fail, show an actionable error and retain uploaded evidence.
- [x] Do not use fabricated AI output in the live demonstration. No synthetic model results or sample inspection records are included.
- [ ] Successful live-model validation remains open until the configured Meta account has billing and model access; do not present the current HTTP 402 blocker as a successful model result.

## 10. Documentation and deployment readiness — ☐
- [x] README is complete and explains the problem, features, technologies, installation, environment variables and running instructions.
- [x] `.env.example` exists and contains `MODEL_API_KEY=your_meta_model_api_key`; use the same Meta Model API key for Muse Spark and SAM 3.1; never commit actual credentials; document actionable setup if the key is absent.
- [x] PROJECT_SUMMARY.md explains MajiProof's problem, innovation, intended users and value proposition.
- [x] TECHNICAL_ARCHITECTURE.md explains model orchestration, application architecture, data contracts and computer-vision pipeline.
- [x] DEMO_SCRIPT.md provides the 90-second demonstration sequence.
- [x] LIMITATIONS.md documents model limitations, visual-verification boundaries and areas requiring human assessment.
- [ ] Prepare the application for deployment to Vercel; deploy if deployment credentials are available.
- [x] No actual secrets are committed.
- [ ] No broken or misleading features remain.
- [ ] No Vercel credentials were available during this delivery; a Vercel deployment remains open.

## Explicitly deferred scope

Do not implement full enterprise user management, subscription payments, complex GIS systems, county-level dashboards, mobile native applications, water-quality laboratory analysis, IoT integrations, predictive maintenance models, blockchain verification, multi-agent orchestration frameworks, complex offline synchronization, automated technician dispatch or automatic engineering diagnosis. Do not turn MajiProof into a generic AI assistant. Optional video support is only considered after the complete image-based workflow works reliably; do not make audio transcription or voice understanding a critical dependency. Never sacrifice P0 functionality for optional features.


# Phase 2 — Multimodel Intelligence, Inference Optimization & Partner Infrastructure

Phase 2 status: ☐ open · Complete only when implemented and supported by evidence. All partner live-inference outcomes remain open until the relevant project credentials/access are configured and a real request succeeds.

Current Phase 2 audit: The existing Next.js/React/TypeScript project and its field workflow were preserved. The provider registry, shared vision-provider contract, normalized schemas, Fireworks and Baseten adapters, gated Modal adapter, development-only workbench, empty ten-slot benchmark manifest, safe inference logging, concurrency queue, status panel and Phase 2 docs are implemented. The unit suite now has 35 passing tests; optional live tests are skipped unless explicitly opted in. Only `MODEL_API_KEY` is configured. The last real Meta Muse/SAM smoke calls returned HTTP 402 `billing_not_configured`; they produced no result. Fireworks/Baseten credentials and a project Modal endpoint are absent. No successful model inference or benchmark result is claimed. A public listing is not account access or a successful project integration.

## 11. Existing application audit and preserved functionality — ☑
- [x] Inspect the complete repository and understand its existing application architecture before modifying it.
- [x] Identify implemented features, working Meta API integrations, incomplete or simulated functionality, environment-variable names, build errors and technical debt.
- [x] Run the application and the existing available checks; report that no dedicated test suite or test script existed before Phase 2.
- [x] Do not rebuild the application from scratch. Extend its architecture and preserve all functioning features.
- [x] Do not replace working functionality without a demonstrated technical reason.
- [x] Do not claim an integration is complete until a real API request has succeeded.

## 12. Provider abstraction, normalization and explicit model identity — ☑
- [x] Implement a modular inference architecture that separates the application from its AI providers.
- [x] Preserve Muse Spark 1.3 through Meta Model API as the primary intelligence model.
- [x] Support Muse Spark Open through supported partner inference endpoints as an explicitly identified experimental model variant.
- [x] Keep SAM 3.1 through Meta Model API as a separate computer-vision integration.
- [x] Keep Muse Spark 1.3 and Muse Spark Open as explicitly identified model variants. Never silently substitute one for another.
- [x] Do not assume that a partner offering Muse Spark Open also hosts SAM 3.1.
- [x] Implement an application → AI orchestration → provider adapter → model API → validated output → evidence-engine boundary.
- [x] Implement a common `VisionProvider` interface with provider ID, model ID, `analyzeImage(image, context)` and `compareEvidence(before, after)` operations.
- [x] Build separate provider adapters for Meta Muse Spark, Fireworks Muse Spark Open, Baseten Muse Spark Open and, only where justified and configured, Modal Muse Spark Open.
- [x] Normalize all provider responses into the same application-level Zod schemas.
- [x] Never let provider-specific response structures leak into the frontend.

## 13. Fireworks AI Muse Spark Open integration — ☐
- [x] Use the official supported Muse Spark Open model identifier, endpoint and request format verified in the current official Fireworks documentation.
- [x] Authenticate only server-side with the documented Fireworks API key; validate configuration without exposing a key to the client.
- [x] Implement Fireworks image input only for documented MIME types and size limits.
- [x] Validate structured JSON output against MajiProof's shared Zod schema before displaying or storing it.
- [x] Handle provider errors, request timeouts, token usage and measured response time where returned.
- [x] Do not use the Fireworks adapter for SAM 3.1 unless official documentation explicitly confirms support.
- [x] Add the exact documented authentication variable name and actionable secure configuration instructions.
- [ ] Benchmark Fireworks against existing Muse Spark 1.3 on the same selected inspection evidence and identical inspection prompt.
- [ ] Measure actual output quality, response time, schema validity and cost only when a real request and its provider usage data are available.
- [x] Do not assume Muse Spark Open is automatically better than Muse Spark 1.3.
- [x] Do not claim Fireworks integration succeeded until a real authorized inference call returns successfully.

## 14. Baseten model/API investigation and optional adapter — ☑
- [x] Verify current Muse Spark Open model availability and the actual Model API or dedicated deployment route in Baseten's documentation.
- [x] Document authentication, exact model identifier, request/response formats, image/video modalities, streaming support, scaling behavior and account-variable rate limits.
- [x] Implement a server-side Baseten adapter only against the documented current hosted model API contract.
- [x] Keep the Meta provider operational if Baseten is unavailable.
- [x] Use available hackathon credits only if access is granted, credentials exist and an explicit live test is authorized.
- [x] Design the provider interface for future multiple inspection photographs and concurrent NGO users without claiming that this project has provisioned throughput.
- [x] Do not present Baseten as deployed or functional without a successful inference test.

## 15. Modal endpoint and compute investigation — ☑
- [x] Investigate the documented Muse Spark Open endpoint and available Modal GPU infrastructure.
- [x] Evaluate image preprocessing, video-frame extraction, asynchronous batch inspection, evidence-processing jobs and repeatable model evaluation as potential Modal workloads.
- [x] Create a separate processing service only when it provides measurable value.
- [x] Do not migrate the existing frontend or application backend to Modal unnecessarily.
- [x] Verify authentication and endpoint requirements from official Modal documentation; do not guess or invent a project endpoint URL/model name.
- [x] Keep any Modal inference adapter unavailable until the project's Shared Endpoint, proxy-token credential and model-specific image request contract are confirmed.
- [x] Do not implement speculative GPU infrastructure merely because GPU credits may be available.
- [x] Implement video and batch-processing experiments only after the image workflow is stable.

## 16. Explicit model router and provider readiness — ☑
- [x] Implement configurable explicit provider selection and explicit model selection.
- [x] Implement provider availability/configuration checks, timeouts, bounded retry behavior, validated output normalization, safe error reporting and token-usage tracking where supported.
- [x] Default Muse Spark 1.3 to Meta and SAM 3.1 to Meta.
- [x] Keep the Muse Spark Open experiment disabled until it is configured and validated.
- [x] Never silently switch models after an error.
- [x] If a future fallback is required, record the actual provider/model used and communicate the substitution; otherwise fail visibly rather than fall back.
- [x] Keep segmentation selection independent of vision-provider selection.
- [x] Do not send ordinary inspection images to multiple providers automatically.

## 17. Developer model-evaluation workbench and benchmark dataset — ☐
- [x] Create a developer-facing interface where a developer can select an inspection photograph, model provider and model variant, then submit the same inspection prompt explicitly.
- [x] Allow the developer to compare generated findings, inspect validated structured JSON, see latency and token usage when available, record errors and assess output quality.
- [x] Keep provider/model selection out of the ordinary field-user workflow.
- [x] Create an unpopulated benchmark dataset structure for 10–20 inspection examples and use consistent prompts across providers.
- [ ] Evaluate visual accuracy (whether observations are supported by the photograph), evidence discipline (whether unsupported conclusions are avoided), structured-output validity, inspection relevance to technicians, segmentation-prompt relevance, actual latency and measured or documented cost.
- [x] Do not fabricate benchmark results or sample model outputs.
- [x] Distinguish objective measured values from human qualitative assessments.
- [x] Tie any cross-provider comparison to the same image fingerprint and same prompt; send an image only to the provider explicitly selected for that run.
- [x] Make live partner inference an explicit action, not an automatic dashboard page load or background evaluation.

## 18. Preserve and report the existing inspection experience — ☑
- [x] Preserve the existing journey: create inspection; upload before-repair evidence; analyse visual conditions; segment infrastructure components; upload after-repair evidence; compare both records; review outstanding concerns; generate an inspection report.
- [x] Keep the provider architecture invisible to ordinary field users.
- [x] Identify which model generated each AI observation in inspection reports where model attribution is available.
- [x] Maintain the distinction between AI observations and human-approved decisions.
- [x] Muse Spark may propose useful visual objects to investigate, but SAM must perform the actual segmentation.
- [x] Do not substitute an LLM-generated description or decorative overlay for an actual segmentation result.
- [x] Preserve bounding-box extraction, decoded pixel masks, overlay visibility controls, selected-object labels, segmentation persistence and graceful no-match handling.

## 19. Inference observability and developer status — ☑
- [x] For each completed request, record request ID, inspection ID, provider, model identifier, operation, start and completion time, measured latency, returned token usage, success/failure and a safe error category.
- [x] Never record API secrets or unnecessarily retain raw image content in logs.
- [x] Create a developer-facing status panel showing Meta API connectivity, Muse Spark availability, SAM 3.1 availability, Fireworks availability, Baseten availability and Modal availability.
- [x] Distinguish provider states: configured, available, not configured, failed health check and not yet tested. A configured credential does not mean an endpoint has succeeded.
- [x] Never label a model available merely because a key is present or a public model catalog lists it.

## 20. Performance, security and cost controls — ☑
- [x] Keep all provider credentials server-side and validate required environment variables without exposing secrets in browser bundles.
- [x] Preserve image MIME, signature and size validation, request timeouts, controlled concurrency, request throttling and graceful actionable errors.
- [x] Do not fabricate fallback results.
- [x] Route cost-consciously: one configured primary provider handles ordinary inspection and alternate providers are reserved for explicit controlled evaluation.
- [x] Do not send every photograph to every provider by default.
- [x] Do not consume partner credits on duplicated or unnecessary requests.
- [x] Make experimental inference explicitly configurable and disabled by default; use current documented provider limits and clearly label dated list-price estimates.

## 21. Automated tests and optional live smoke tests — ☑
- [x] Add automated tests for the provider registry, model routing, provider errors, Zod schema validation, invalid model responses, bounded retry behavior, comparison normalization, SAM segmentation parsing, unavailable providers and secret protection.
- [x] Add optional live smoke tests for each provider that execute only with an explicit live-test opt-in and that provider's relevant credentials; ordinary tests must make no outbound inference calls.
- [x] Test providers independently.
- [x] A mocked response is permitted in unit tests but must never be reported as proof of successful live model integration.

## 22. Phase 2 documentation and factual integration status — ☑
- [x] Update `README.md`.
- [x] Update `TECHNICAL_ARCHITECTURE.md`.
- [x] Create or update `MODEL_PROVIDER_GUIDE.md`.
- [x] Create `MODEL_BENCHMARK.md`.
- [x] Create `ENVIRONMENT_SETUP.md`.
- [x] Update `LIMITATIONS.md`.
- [x] Clearly label what is implemented, what was tested live, and what remains experimental.
- [x] If partner credentials or selected-participant access are unavailable, document exact integration requirements and leave that adapter safely disabled.
- [x] Do not publish a deployed or successful provider claim without the relevant verified result.
