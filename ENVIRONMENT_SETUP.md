# MajiProof environment setup

## Local requirements and first run

Use Node.js 22.9 or newer and pnpm 11.25.0. The repository declares the pnpm version in `package.json`; the current project was checked with Node.js 22.23.4 and pnpm 11.25.0.

```sh
pnpm install
cp .env.example .env.local
```

Edit `.env.local` with a secure editor and add `MODEL_API_KEY` from the Meta Model API account. Do not paste credentials into chat, commit them, place them in client code, or prefix them with `NEXT_PUBLIC_`. Then run:

```sh
pnpm dev
```

The application listens on port 3000. Case metadata, photos, model results and reviews are stored in the current browser's IndexedDB; they are not a shared server database or synchronized backup.

## Meta field provider

`MODEL_API_KEY` is the server-only credential for Meta Muse Spark 1.3 and Meta SAM 3.1. Defaults are `MAJIPROOF_PRIMARY_VISION_PROVIDER=meta`, `MAJIPROOF_PRIMARY_VISION_MODEL=muse-spark-1.3`, `MAJIPROOF_SEGMENTATION_PROVIDER=meta` and `MAJIPROOF_SEGMENTATION_MODEL=sam-3.1`. SAM is an independent route and cannot be switched to a Muse Spark Open partner.

A stored key only means the server has a credential. The provider account must separately have billing and access for each model. The last recorded live Muse Spark/SAM requests returned HTTP 402 `billing_not_configured`; this project has not verified successful Meta inference. Enable billing and access through Meta, then run an explicit analysis or live smoke test. MajiProof will not alter billing, retry indefinitely or produce fallback output.

## Optional Muse Spark Open partners

Partner credentials are optional and are never required to use the local case-record workflow. Configure credentials through secure server environment settings. The `.env.example` partner keys are empty. Provider contract details and documentation links are in [MODEL_PROVIDER_GUIDE.md](./MODEL_PROVIDER_GUIDE.md).

- **Fireworks AI:** set `FIREWORKS_API_KEY`. This project uses `https://api.fireworks.ai/inference/v1` and model `accounts/fireworks/models/muse-spark-open`. The adapter currently accepts JPEG and PNG only, and enforces the documented base64-image payload limit. WebP is rejected by this adapter; the photograph is not silently converted.
- **Baseten:** set `BASETEN_API_KEY`. This project uses `https://inference.baseten.co/v1` and model `meta-models/muse-spark-open`. The adapter accepts JPEG, PNG and WebP and locally enforces the documented request-size constraint.
- **Modal Shared Endpoint:** first create and authorize this project's endpoint in the Modal workspace. Set `MODAL_PROXY_TOKEN` and the exact `MODAL_ENDPOINT_MODEL` value from the endpoint's own request example. Review a real image-input example for the project endpoint before setting `MODAL_IMAGE_INPUT_VERIFIED=true`. The adapter stays disabled until the token, endpoint model and image-input verification gate are present. Do not substitute the public library model label for the project's endpoint model name or invent a URL.

A configured credential does not mean the account can access the model. Partner adapters remain unverified until an authorized real request succeeds. Modal is intentionally not enabled on the basis of public catalog availability alone.

## Developer evaluation gate

The `/developer/models` page and evaluation APIs are restricted to development mode. By default, explicit partner evaluation is off. To enable the workbench for a local development session, set:

```dotenv
MAJIPROOF_EXPERIMENTATION_ENABLED=true
```

Restart the server after environment changes. Choose one provider/model and a suitable photo inside the workbench. The page load does not call a provider. Experimental providers remain out of ordinary field requests; `MAJIPROOF_ALLOW_EXPERIMENTAL_FIELD_PROVIDER` should remain `false` unless the operator deliberately authorizes a previously validated model for the ordinary field route. A provider error never triggers a substitution.

## Routine checks and opt-in live requests

These checks do not request inference from external model providers:

```sh
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test:live` is a separate operator-invoked command. Vitest does not automatically load Next's `.env.local`; export credentials to the test process through a secret manager or secure runner, without printing or placing them in command-line arguments. Set `MAJIPROOF_SMOKE_IMAGE_PATH` to an appropriate non-sensitive JPEG, PNG or WebP photograph and explicitly opt in by running the live test command. It checks each configured provider as a separate test; a successful result is recorded only for a real request that returns valid MajiProof data.

For a SAM 3.1 smoke request, also set `MAJIPROOF_RUN_LIVE_SAM_SMOKE=true` before invoking `pnpm test:live`. SAM calls may be billable. Do not run this command without appropriate provider access and explicit authorization for the image and potential usage cost. The live runner rejects images over 8 MB, unsupported image signatures, more than 50 megapixels or 12,000 pixels on a side.

Example of setting the non-secret image path in the current shell after credentials are securely exported:

```sh
export MAJIPROOF_SMOKE_IMAGE_PATH=/absolute/path/to/operator-selected-photo.jpg
pnpm test:live
```

Use a temporary environment or secret manager for CI. Never print environment contents in logs. The tests are optional, credential-gated and not part of `pnpm test` or `pnpm build`.

## Deployment

No Vercel deployment has been completed; deployment credentials were not available in the current project state. For a future deployment, configure `MODEL_API_KEY` and any deliberately enabled provider variables in server-side project settings. Do not rely on developer workbench flags in production, and do not deploy partner field routing until a real authorized request has succeeded and the exact provider/model selection is reviewed.
