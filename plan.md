# MajiProof implementation plan

## Product scope and implementation

The initial build is a local-first inspection workspace for WASH NGOs, inspectors, technicians and supervisors. It covers inspection creation, paired before/after evidence, image analysis, object segmentation, side-by-side comparison, distinct human review, and PDF reports. It records visible-flow observation separately for each photograph without inferring capacity or water quality. A supervisor cannot approve until both photographs have been compared; decisions are bound to the evidence IDs and comparison snapshot, then marked historical if those change. It does not claim a repair is technically verified or create synthetic model output. No account, precise location, or personally identifying information is required. Images and inspection records stay in IndexedDB unless the user explicitly sends selected evidence to the server-side Meta API; no cloud data store is added.

The project began without application source or a package manifest. Use Next.js App Router, React, TypeScript, CSS, and server route handlers, pinned with pnpm 11. Use Zod for runtime validation, the official OpenAI-compatible SDK against `https://api.meta.ai/v1`, `@meta-sam/parser` for SAM stream parsing and mask decoding, `image-size` to verify server-side file signatures and image dimensions, Lucide for functional icons, and jsPDF for user-triggered client-side PDF generation. Never serialize the API key into client output. Use a request timeout, an 8 MB per-file limit, a bounded multipart body, and pre-storage image decoding with a 50-megapixel / 12,000-pixel per-side cap enforced in the browser and on the server. Include `.env.example`, README instructions, and a helpful missing-key state.

The browser data layer stores case metadata and image blobs separately in IndexedDB and provides an in-memory-safe empty state. The Overview shows persisted totals, recent cases and a distinct latest-update-per-case activity summary that is not represented as a complete audit log. The main pages are `/` (overview), `/inspections`, `/inspections/new`, `/inspections/:id`, `/reports`, and `/settings`. The inspection page groups asset details, before evidence and findings (including visible finding IDs), segmentation, after evidence, comparison, human review, and reporting.

Server endpoints are `/api/health`, `/api/analyze`, `/api/segment`, and `/api/compare`. Muse Spark 1.3 receives the original image(s) as data-URL `input_image` blocks via Responses API and requests JSON Schema output. Parse the output and Zod-validate it; if malformed, retry once with an explicit correction, then return an actionable error. SAM 3.1 receives the original image and one short noun concept at a time via Responses streaming; `@meta-sam/parser` parses the stream and decodes authentic boxes and masks. Return the decoded raster as data and render a togglable overlay in the client. Empty segmentation is a valid no-match result; API failure is not a mask. Comparison submits both images and their stage records to Muse Spark and validates the enumerated result. Model requests treat image content as untrusted evidence, not instructions.

## Phase 2 — provider portability and controlled evaluation

Preserve and extend the working application rather than rewriting it. Wrap the existing Meta Muse Spark 1.3 analysis and comparison, Meta SAM 3.1 segmentation, Fireworks Muse Spark Open, and Baseten Muse Spark Open behind a server-side provider registry and explicit router. Meta remains the default vision provider and exclusive segmentation provider. Each provider uses the same shared prompts and Zod validation; provider-specific response and usage formats are normalized before they reach the client. Muse Spark 1.3 and each Muse Spark Open provider variant remain distinct. A failed request never silently switches providers or creates a replacement result.

The Fireworks adapter uses the verified model path `accounts/fireworks/models/muse-spark-open`, its documented OpenAI-compatible Chat Completions endpoint, and base64 `image_url` parts. Reject Fireworks inputs outside the provider's documented MIME or encoded-image size limits. The Baseten adapter uses model slug `meta-models/muse-spark-open`, its documented Model API and image content part. Neither partner adapter is considered live-tested: no partner key or account-specific access is currently configured. The Modal Shared Endpoint is documented but not enabled by default; require the project's own endpoint name, proxy token, and explicit confirmation of its model/image request example before selecting it. Do not add a standalone GPU processing service without measured latency, volume or cost evidence.

Use JSON-only output where documented, locally validate all model JSON with the shared Zod schemas, and allow at most one schema-correction attempt. Keep API retries off; show sanitized provider-specific errors. Capture request ID, inspection/benchmark ID, provider/model, operation, start/completion timestamps, measured round-trip latency, token usage when returned, success/failure and safe error category. Do not log images, data URLs, full prompts, raw provider bodies or secrets. A process-local concurrency ceiling and existing request throttling constrain spend; both are documented as per-instance, not distributed guarantees.

Add `/developer/models` outside the ordinary field navigation, plus a status API and a development-only explicit inference endpoint. The workbench selects one provider/model per click, uses a selected local photograph and a repeatable prompt, compares stored results only when the image fingerprint and prompt match, and permits human ratings of visual accuracy, evidence discipline, schema validity, technician relevance and segmentation-prompt relevance. Persist benchmark outputs, ratings and inference logs in a new IndexedDB store; do not persist the workbench photo separately or send it anywhere until the developer requests an inference. Production requests to evaluation APIs are rejected. Experiments and partner calls are off unless explicitly enabled. Provide a ten-slot empty benchmark manifest, clearly marked unpopulated, with no fabricated photographs, labels or scores.

Add provider provenance to successful AI findings and include it in reports where stored. Keep the existing comparison, evidence review and PDF behavior intact. SAM 3.1 remains an independent streamed Meta request, uses the official parser and actual decoded mask/box, and is never routed to Muse Spark Open partners. Preserve graceful no-match and failure behavior.

Current account constraints are explicit: only `MODEL_API_KEY` is present; the recorded Meta smoke response was HTTP 402 `billing_not_configured`; partner inference credentials and a project Modal endpoint are absent. Do not issue paid requests during routine tests. Unit tests use mock clients; optional live smoke tests require an explicit opt-in and the relevant credential. The workbench reports real successful inference only after a successful provider response. List prices, if displayed, are dated provider-list-price estimates, not measured invoice cost. No deployment or new provider service is required for this phase.

## Project structure

```text
src/app/                    App Router pages, global styles, route handlers and developer workbench
src/components/             Navigation, dashboard, case form, evidence, inspection and evaluation UI
src/lib/schemas.ts          Zod schemas for analysis, comparison and cases
src/lib/constants.ts        Client-safe image MIME and size constraints
src/lib/server-security.ts  Server-side upload validation and API request throttling
src/lib/review.ts           Comparison/evidence snapshot validation for review freshness
src/lib/meta/               API client and Muse Spark / SAM orchestration
src/lib/ai/                 Provider contracts, registry, explicit router, prompts, usage and safe status
src/lib/ai/providers/       Meta Muse/SAM, Fireworks Muse Open, Baseten Muse Open and gated Modal adapter
src/lib/storage/            IndexedDB persistence and local query helpers
src/lib/pdf/                jsPDF inspection report generator
src/types/                  Shared browser/server data contracts
tests/                      Deterministic unit and opt-in credential-gated live smoke tests
data/benchmark/             Empty, 10-case benchmark-manifest template
public/branding/            MajiProof logo mark
public/manus-routes.json    Static manifest of all page routes, including developer workbench
README.md                   Setup, operation, provider readiness and safe-use guide
PROJECT_SUMMARY.md          Problem, innovation, users and value
TECHNICAL_ARCHITECTURE.md   Provider routing, model contracts and data flow
DEMO_SCRIPT.md              90-second live walkthrough
LIMITATIONS.md               Honest model and verification boundaries
.env.example                Placeholders for model-provider and experimental configuration
MODEL_PROVIDER_GUIDE.md     Current official provider endpoints, identifiers, modality and access caveats
MODEL_BENCHMARK.md          Measurement method and explicit no-live-results state
ENVIRONMENT_SETUP.md        Secure configuration and provider enablement steps
```

## Design

**Design Movement:** Field Systems modernism: a restrained, editorial infrastructure console with subtle topographic and measurement cues.

**Core Principles:** evidence is primary; observation is separate from judgment; color signals state consistently; compact information remains legible on a phone.

**Color Philosophy:** forest green communicates stewardship and operational seriousness; warm paper tones feel like durable field records; water blue marks water-related evidence without implying safety; amber is reserved for uncertainty or action; charcoal supports high-contrast reading.

**Layout Paradigm:** persistent narrow navigation beside an expansive evidence workspace; sequential case stages run as a clear horizontal rail on desktop and a compact two-column sequence on mobile. Images and comparison receive the largest uninterrupted surfaces.

**Signature Elements:** a waterline-and-check emblem; numbered evidence stages; a restrained amber uncertainty marker.

**Interaction Philosophy:** direct manipulation for photo capture, replacement, overlay toggles and review decisions. Save progress locally and make network/model calls explicit. Every async action exposes progress, retry or a specific failure.

**Animation:** minimal 140–200 ms transitions for active stages, focus and overlay changes; no looping or decorative movement; respect reduced-motion preferences.

**Typography System:** DM Sans provides the interface, DM Mono marks stage IDs and operational labels, and Libre Baskerville is reserved for report and page titles; system fallbacks maintain mobile legibility when web fonts are unavailable.

**Brand Essence:** evidence records for rural water repairs, helping teams compare what is visible without overstating what the evidence proves; accountable, grounded, clear.

**Brand Voice:** specific and calm, never certifying what the model cannot establish. Examples: “What changed is visible. What remains uncertain is recorded.” “This observation needs a human inspection.”

**Wordmark & Logo:** compact waterline/check mark built as a two-stroke SVG, paired with a tracked uppercase MAJIPROOF wordmark.

**Signature Brand Color:** deep Maji forest green, supported by off-white, water blue and muted amber.
