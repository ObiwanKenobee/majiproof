# MajiProof Technical Architecture

## System shape

MajiProof is a Next.js App Router application with React and TypeScript. Page routes present the overview, case list, case creation, dynamic inspection workspace, report library and settings. Server routes are isolated under `/api/health`, `/api/analyze`, `/api/segment` and `/api/compare`. Source modules separate schemas, Meta orchestration, browser storage, PDF generation and UI components.

The current data layer is IndexedDB. `inspections` holds case metadata, `evidence` holds the image Blob and stage-specific analysis, SAM outputs and comparison, and `reviews` stores a separate human decision. Images and text remain on the device except when a user invokes one of the model actions. The structure permits a later storage adapter without making a remote database required now.

## Model flow

The server creates an OpenAI-compatible SDK client with base URL `https://api.meta.ai/v1` and protected `MODEL_API_KEY`. Muse Spark requests use `muse-spark-1.3`; they include the selected image as a `data:` URL in an `input_image` block. Structured output uses a JSON Schema in the Responses `text.format` setting. The returned output text is parsed and validated against a Zod schema. Invalid structured data receives one correction request; a second validation failure becomes a visible error, never fabricated data.

Analysis is stage-specific. Findings preserve the source image stage, observation, evidence explanation, confidence category, optional SAM concept and human inspection requirement. Instructions explicitly prevent inferring potability, capacity, reliability, engineering diagnosis or verified repair from appearance. Image content, field notes and prior model findings are untrusted context, not instructions.

For comparison, both the original before and after image are submitted in order along with case context and compact saved findings. The result is limited to observable differences, persisting concerns, unanswered questions, evidence limitations, one of four review categories, and a separate visible-flow observation for each image. It does not update an asset to a technically verified state or infer water capacity, reliability or potability.

## SAM segmentation and rendering

A short, concrete noun phrase is sent with the original image to `sam-3.1` using a streamed Responses API request and one-bit masks. `@meta-sam/parser` consumes the async event stream with `parseImageStream`; the app selects actual `box` and `mask` records, matches them by object ID, and decodes each mask using `decodeMaskToRaster`. No custom SAM token grammar parser exists in application code.

The API returns the mask raster with its width, height and source-image bounds. The browser reconstructs a transparent canvas over the exact original image, scales the mask into its source-pixel bounds and draws the returned box and concept label. The overlay is optional and toggleable. A completed stream with no matching records is represented as “no match”; a failed or incomplete stream creates no overlay.

## Data contracts

Shared TypeScript records live in `src/types/inspection.ts`; model response and form validation lives in `src/lib/schemas.ts`. The inspection contract contains asset ID/name/type, site, optional region, date, stage, timestamps and workflow status. An evidence record references a case and a before/after stage, and stores the original filename, MIME type, timestamp and optional note. AI analysis, comparison outcome and human review are separate types. Review records snapshot the source evidence IDs and comparison so changed model results or replaced photos make a previous decision historical rather than appearing to approve current evidence. Approval requires both photos and a completed comparison.

The client decodes uploads and rejects images above 50 megapixels or 12,000 pixels per side. Server routes independently inspect JPEG/PNG/WebP signatures and dimensions with `image-size`, require detected content to match the declared MIME type, enforce per-image and multipart request limits, validate form fields, use a short in-memory request throttle and enforce an SDK timeout. Secrets are never sent to client bundles. PDF creation takes stored case/evidence/review data in the user's browser and adds original photographs and available parsed SAM annotations; historical reviews are labeled as prior decisions.

## Current provider readiness

The protected API key is present, but live requests during this build returned HTTP 402 `billing_not_configured` for Muse Spark and SAM. No successful model output is claimed. Provider billing and model access must be enabled before the analysis, segmentation and comparison path can be presented as an end-to-end live demo. Vercel credentials were not available, so no Vercel deployment was performed.

## Official API references

- [Meta Model API models](https://dev.meta.ai/docs/models) — model IDs, image/video capability and SAM overview.
- [Meta Responses API](https://dev.meta.ai/docs/protocols/responses) — typed message input and streaming events.
- [Meta image understanding](https://dev.meta.ai/docs/image-understanding) — `input_image` blocks and base64 data URLs.
- [Meta structured output](https://dev.meta.ai/docs/structured-output) — Responses `text.format` JSON Schema.
- [Meta SAM overview](https://dev.meta.ai/docs/sam/overview) — SAM 3.1 Responses endpoint, streaming and parser use.
- [Meta SAM segmentation](https://dev.meta.ai/docs/sam/segmenting) — one short noun phrase per concept request.
- [Meta SAM client libraries](https://dev.meta.ai/docs/sam/client-libraries) — parser, stream and mask decoding APIs.
- [Meta SAM output grammar and raster shape](https://dev.meta.ai/docs/sam/reading-segmentation) — source boxes and decoded mask dimensions.


## Provider-independent Phase 2

`src/lib/ai/` defines a shared vision-provider contract and server-side explicit registry. The ordinary vision default remains Meta `muse-spark-1.3`; Meta `sam-3.1` remains an independent segmentation route. Fireworks Muse Spark Open (`accounts/fireworks/models/muse-spark-open`) and Baseten Muse Spark Open (`meta-models/muse-spark-open`) are separate experimental variants, not substitutes for Meta Muse Spark 1.3. Modal has no guessed public-model alias: its model name must come from the project's own Shared Endpoint request example. Provider-specific responses are normalized to shared MajiProof Zod schemas before reaching the application.

Ordinary field requests use one explicitly configured vision provider and never fan images out to all providers. Segmentation is Meta-only. A failed call does not switch providers. The development-only workbench requires `MAJIPROOF_EXPERIMENTATION_ENABLED=true`, and provider/model selection requires an explicit operator action; the page does not infer on load. Production workbench access is rejected. Experimental field routing remains disabled unless deliberately authorized after validation.

The shared partner adapter uses documented OpenAI-compatible Chat Completions, image URL parts, JSON-object response mode, local schema validation, a 90-second timeout and no SDK auto-retries. It allows at most one schema-correction request. Fireworks is restricted in this build to JPEG and PNG and its documented encoded-image limit. Baseten supports JPEG, PNG and WebP under its current documented limit. The Modal adapter remains unavailable until the project has `MODAL_PROXY_TOKEN`, the exact `MODAL_ENDPOINT_MODEL`, and `MODAL_IMAGE_INPUT_VERIFIED=true` after review of the project's actual image-input example.

## Workbench and benchmark records

The developer workbench can select a browser-local case photo or temporary photo; the raw photo is sent only after an explicit Run action and only to the selected provider. It computes SHA-256 fingerprints for image bytes and the shared prompt, then compares records only when both match. Validated output, permitted request metadata and optional evaluator notes/ratings are saved locally; the photograph is not copied into the benchmark log. Human ratings cover visual accuracy, evidence discipline, schema validity, technician relevance and segmentation-prompt relevance on a 1–5 scale. These are subjective manual scores, not ground truth. `data/benchmark/manifest.template.json` is an empty ten-slot manifest with no records because no permissioned imagery or human labels were supplied.

## Inference status and safeguards

The executor records request ID, provider, model, operation, prompt version, optional inspection/benchmark ID, timestamps, measured round-trip latency, returned token usage where available, outcome, safe error category and result count where applicable. It excludes secrets, raw images/data URLs, image URLs, full prompts and raw provider bodies. The developer status panel distinguishes configured credentials from an explicit successful inference. Availability is never inferred from public catalog listing or credential presence. Server check history and the inference queue are process-local; the queue is not a distributed concurrency limit.

`pnpm test` uses deterministic unit tests and makes no live provider inference calls. `pnpm test:live` is a separate explicit operator action and runs one test per configured provider when a supported operator-selected image is supplied. The SAM smoke call has a separate `MAJIPROOF_RUN_LIVE_SAM_SMOKE=true` gate. At the last recorded live check, Meta Muse Spark and SAM requests returned HTTP 402 `billing_not_configured`; no successful result is claimed. Partner credentials and a Modal project endpoint were absent. See [MODEL_BENCHMARK.md](./MODEL_BENCHMARK.md) for the evaluation method and [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for secure setup.
