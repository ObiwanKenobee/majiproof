# MajiProof model provider guide

**Documentation checked:** 4 November 2026. Provider catalog entries describe public offerings, not access or billing in the MajiProof project. Project environment currently contains only `MODEL_API_KEY`; Fireworks, Baseten and Modal credentials/deployment identifiers are not configured. No partner inference call was made for this guide.

## Current application boundary

The field workflow keeps Meta Muse Spark 1.3 as the explicit default and Meta SAM 3.1 as its separate segmentation integration. Its existing real API calls use the Responses API and the official SAM parser. Live Muse and SAM requests previously returned HTTP 402 `billing_not_configured`; a present key therefore does not imply an available model. No adapter should substitute Muse Spark Open for Muse Spark 1.3 or return invented output. Selection errors must name the requested provider/model and retain the original evidence.

## Fireworks AI — Muse Spark Open

Fireworks currently lists Muse Spark Open as **Ready**, with model path `accounts/fireworks/models/muse-spark-open`, native text-and-image input, serverless availability on US-only capacity, and an on-demand deployment option. The documented OpenAI-compatible JavaScript base URL is `https://api.fireworks.ai/inference/v1`; the Chat Completions request is `POST /chat/completions`. Images can be sent as `image_url` content parts, including a base64 data URL. Fireworks documents a 10 MB total base64-image limit and lists PNG, JPG/JPEG, GIF, BMP, and TIFF formats; WebP is not listed in that supported-format list. MajiProof should reject unsupported WebP and oversized base64 inputs for this adapter rather than silently changing the evidence image. [1] [2] [3]

The general Fireworks Chat Completions API supports JSON-object and JSON-Schema response formats. The structured-output guide does not specifically confirm `json_schema` compatibility for Muse Spark Open. Use the documented JSON-object mode only when requested, repeat the required shape in the prompt, and always Zod-validate locally; keep the adapter marked **not live-tested** until a real account request succeeds. The API documents token usage and optional performance metadata. Current published Standard rates are $1.25 per million input tokens, $0.15 per million cached input tokens and $4.25 per million output tokens. Any cost shown in MajiProof must be labelled a list-price estimate, not invoice cost. [3] [4] [5]

Authentication uses a server-only `FIREWORKS_API_KEY` bearer credential. The Fireworks catalog/model path is an explicit Muse Spark Open variant; it is never a replacement for Meta's `muse-spark-1.3`. [1] [2]

## Baseten — Muse Spark Open

Baseten currently lists Muse Spark Open in its Model API catalog with model slug `meta-models/muse-spark-open`, text, image, video and audio inputs, and text output. Its documented Model API base URL is `https://inference.baseten.co/v1` and it uses OpenAI-compatible Chat Completions with the `image_url` content part. Muse Spark Open's documented limits include up to eight images and a 10 MB per-image URL limit; the vision guide allows up to 100 MiB of base64 request body for Muse Spark Open and lists JPEG, PNG, WebP, GIF, BMP and TIFF. MajiProof submits one image per analysis request, within its own smaller upload cap. [6] [7] [8]

The server-side credential name is `BASETEN_API_KEY`. The model catalog's current published Model API rates are $1.25 per million input tokens, $0.15 per million cached input tokens and $4.25 per million output tokens. Model API tier limits vary by account and workspace; catalog availability does not confirm that this project has been granted access, that billing is enabled, or that an active deployment exists. Any local estimate must be labelled a list-price estimate rather than actual invoice cost. [6] [8] [9]

## Modal — Muse Spark Open Shared Endpoint

Modal currently lists Muse Spark Open as a **Shared Endpoint** model, with CLI model identifier `meta-models/Muse-Spark-Open-816B-A42B`. A project must create its own endpoint in the Modal workspace; the endpoint's request example supplies the URL and model name. Shared endpoints are OpenAI-compatible and use a proxy token, with the documented shared inference service at `https://inference.us-west.modal.direct`. Modal's integration guide names the credential `MODAL_PROXY_TOKEN`; its combined value is sent as a bearer token. The model listing states text, image, video and audio modalities. [10] [11] [12]

The reviewed endpoint pages do not give a Muse-Spark-specific image payload example, streaming confirmation, a numeric Muse concurrency limit, or an endpoint URL for this project. Modal documents model/workspace-specific concurrency limits and HTTP 429 responses; the request should not assume dedicated GPU capacity. Current Shared Endpoint list rates are $1.25 per million prompt tokens, $0.15 per million cached prompt tokens and $4.25 per million completion tokens. Shared Endpoint usage is separately billed per token; plan credits may not apply. Do not enable a Modal adapter until the project has a proxy token and created endpoint, and the dashboard request example verifies the image format. No GPU preprocessing or batch service is justified by current traffic evidence. [10] [11] [12]

## Routing and measurement rules

The default field configuration remains `meta` / `muse-spark-1.3` for vision and `meta` / `sam-3.1` for segmentation. Muse Spark Open variants are separately identified per partner using that provider's exact model path. SAM remains Meta-only. Provider choice in the developer workbench is explicit. There is no implicit fallback: a provider error returns an error for the requested model, not a result from another model.

Each request may log a request ID, inspection or benchmark ID, provider, model, operation, timestamps, latency, returned token usage, success/failure and a bounded error category. Logs must exclude API credentials, raw images, data URLs, image URLs, full prompts and provider response bodies. A provider is **available** only after a successful real inference in the current recorded test history. A configured key, a public catalog entry or an HTTP status endpoint alone does not prove inference availability.

The benchmark workbench sends a photograph only to the explicitly selected provider. Same-image comparisons bind results to an image fingerprint and a shared prompt. It stores no seed results or synthetic inspection examples. Human qualitative ratings are labelled manual; latency and token usage are labelled measured; list-price cost estimates are labelled estimates. At present there are no successful live model outputs or comparable latency/cost measurements to report.

## Official references

[1]: https://fireworks.ai/models/fireworks/muse-spark-open "Fireworks Muse Spark Open model catalog"
[2]: https://docs.fireworks.ai/guides/querying-vision-language-models "Fireworks vision-language model requests"
[3]: https://docs.fireworks.ai/api-reference/post-chatcompletions "Fireworks Chat Completions API reference"
[4]: https://docs.fireworks.ai/structured-responses/structured-response-formatting "Fireworks structured outputs"
[5]: https://docs.fireworks.ai/serverless/pricing "Fireworks serverless pricing"
[6]: https://www.baseten.co/library/muse-spark-open/ "Baseten Muse Spark Open model catalog"
[7]: https://docs.baseten.co/inference/model-apis/vision "Baseten Model API vision guide"
[8]: https://docs.baseten.co/reference/inference-api/chat-completions "Baseten Chat Completions API reference"
[9]: https://docs.baseten.co/inference/model-apis/pricing-and-limits "Baseten Model API pricing and limits"
[10]: https://modal.com/library/meta/muse-spark-open "Modal Muse Spark Open model page"
[11]: https://modal.com/docs/guide/endpoints "Modal endpoints and authentication"
[12]: https://modal.com/docs/guide/endpoint-integrations "Modal endpoint integrations"
