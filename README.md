# MajiProof

**Don't just report that water is restored. Prove what changed.**

MajiProof is a local-first visual inspection workspace for rural water infrastructure. It organizes before- and after-repair evidence, and is designed to request actual Muse Spark 1.3 analysis and SAM 3.1 segmentations when the configured Meta account has billing and model access. The evidence comparison and report keep a supervisor's decision separate from model output.

## Current model access status

The server-side Meta API key is configured in this build, but live Muse Spark and SAM smoke requests returned HTTP 402 `billing_not_configured`. Enable billing and model access on the provider account before relying on AI findings, masks or comparisons. No model outputs are fabricated while access is unavailable; uploaded evidence remains stored locally.

## What it does

Create a case for a hand pump, borehole water point, water storage tank, water distribution pipe or water kiosk. Record its asset ID, name, site, optional region, date and current inspection stage. Upload a JPEG, PNG or WebP photo up to 8 MB and 50 megapixels, preview or replace it, and keep an optional field note. Browser camera capture is offered when supported.

When a user requests analysis and provider access is enabled, the server sends the selected photo to Meta Muse Spark 1.3 through the Responses API and validates structured observations with Zod. Findings distinguish visible conditions, confidence, evidence explanation, missing evidence, suggested actions and limitations. A short noun phrase can be sent to Meta SAM 3.1; its streaming response is decoded by `@meta-sam/parser` and its returned mask and box are drawn over the original image. A paired before/after run asks Muse Spark for observable differences and unresolved questions.

The supervisor records an independent decision: approve evidence for the case, request additional evidence or flag an issue. The downloadable PDF includes the saved photographs, AI observations, comparison and human review. It is an evidence record, not a repair certificate.

## Run locally

Requirements: Node.js 22.9+ and pnpm 11. Install the pinned dependencies and launch the development server:

```sh
pnpm install
cp .env.example .env.local
# Put your Meta Model API key in .env.local, never in source control.
pnpm dev
```

Open `http://localhost:3000`. For basic checks use `pnpm typecheck` and `pnpm build`.

`MODEL_API_KEY` is required only when running a model action. In a managed deployment configure it through the secure project environment settings. For Vercel, add the same protected variable in the project’s server environment settings and deploy the app. Never prefix it with `NEXT_PUBLIC_`.

A stored key only confirms that the server has a credential; the Meta API account must also have billing and access enabled for the requested models. When the provider reports `billing_not_configured`, enable billing with Meta and retry. MajiProof does not make provider payment or account changes.

## Data and privacy

Inspection metadata, photos, model results, segmentation rasters and supervisor review are persisted in this browser's IndexedDB. They do not synchronize between devices. Images are sent to the Meta Model API only when a user explicitly runs analysis, segmentation or comparison. The API key remains on the server. MajiProof does not request GPS or require personal identity. Avoid uploading photographs with unnecessary personal information.

Missing model credentials or failed requests are visible as errors. The evidence stays in browser storage; the application never fabricates AI findings or segmentation masks.

## Technical notes

The frontend is Next.js App Router, React and TypeScript. API route handlers perform server-side model orchestration. Zod validates structured model responses. `@meta-sam/parser` handles SAM output text and pixel masks. jsPDF builds reports in the browser. The full workflow and contracts are described in [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md); known boundaries are in [LIMITATIONS.md](./LIMITATIONS.md); the live walkthrough is in [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).


## Provider-independent Phase 2

`src/lib/ai/` defines a common vision-provider interface and explicit registry. Muse Spark 1.3 (Meta) remains the ordinary field default, SAM 3.1 remains a separate Meta-only integration, and Muse Spark Open at Fireworks or Baseten is a distinct experimental model variant. Provider selection is not exposed to field users. The developer-only workbench is at `/developer/models` in development; it requires an explicit run action and compares results only when the selected image and prompt fingerprints match.

Provider responses are normalized through shared Zod schemas. No ordinary request fans an image out to multiple providers, and a failed call does not trigger a silent fallback. Modal is deliberately gated on the endpoint details and image-input contract for this project. See [MODEL_PROVIDER_GUIDE.md](./MODEL_PROVIDER_GUIDE.md), [MODEL_BENCHMARK.md](./MODEL_BENCHMARK.md) and [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for verified contracts, evaluation method and setup.

## Routine checks and live-test gate

`pnpm typecheck`, `pnpm test` and `pnpm build` are the routine local checks. `pnpm test:live` is separate and operator-invoked. Use it only with a suitable operator-selected photo and explicit authorization for provider usage; see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md). A mock test is not evidence of live provider availability.
