# MajiProof limitations

## What image models can and cannot establish

Muse Spark 1.3 summarizes visual evidence. It may miss an object, misread an image, or describe an appearance without knowing its cause. A high, medium or low model confidence category is not an engineering measurement. User notes are context, not independently verified facts. Model output must be reviewed against the original photograph.

SAM 3.1 returns masks and boxes for a supplied concept. A mask is a visual segmentation, not a diagnosis, condition rating or confirmation that a component is functional. A successful no-match result means only that this request returned no mask for the chosen phrase. A failed or incomplete request produces no segmentation result.

## Infrastructure and water safety

A photograph cannot establish whether a water supply meets demand, is consistently available, is clean, or is safe to drink. Visible water flow in a still image does not measure flow rate, pressure, yield, reliability or potability. A visual defect does not identify the engineering cause or prove a repair is complete. These questions require appropriate on-site checks, measurements and qualified human judgment.

## Before-and-after evidence

Differences between two images can be caused by framing, light, weather, occlusion, viewpoint or the passage of time. The model can report visible differences and evidence limitations but cannot authenticate when or where images were taken or establish that a specific intervention caused a change. Meaningful comparison works best when both photos show the same component from similar positions and lighting.

## Privacy and data handling

Case records and photographs are stored in IndexedDB in the current browser and are not synced or backed up to an account. Clearing browser storage can remove them. When an operator invokes analysis, segmentation or comparison, the selected image(s) and included case context are sent to the configured Meta Model API. Avoid uploading unnecessary personal or sensitive details. No GPS permission or account is required.

JPEG, PNG and WebP uploads are limited to 8 MB and are decoded for integrity and dimensions before storage; images above 50 megapixels or 12,000 pixels on either side are rejected to avoid unsafe browser/model processing.

## Human decision and report status

The AI result categories are not repair certifications. A supervisor decision is stored independently and bound to the evidence IDs and comparison state it reviewed. If evidence or the comparison changes, the old decision is retained but marked as prior/historical, not current approval. Approval is available only after both before- and after-stage evidence have been compared. This report is a record of supplied visual evidence and review, not proof of engineering performance or water safety.


## Provider access and evaluation boundaries

The Meta key is present in the current project, but the last real Muse Spark and SAM smoke requests returned HTTP 402 `billing_not_configured`. A live model result has not been established. Fireworks and Baseten adapters are implemented, but no project credential or successful partner inference is recorded. Modal stays gated until this project has a created endpoint, endpoint-specific model name, proxy token and verified image-input example. A provider catalog entry or credential-presence check is not proof of model access.

The developer workbench is development-only, and model calls require an explicit action. The empty ten-slot benchmark manifest has no photos, labels or results because no suitable permissioned benchmark images were supplied. Unit-test mocks are not live model measurements. Human quality ratings are subjective; latency is measured request time; token counts are included only when returned; list prices are not actual invoice costs.

Inference concurrency and rate control are process-local. They do not coordinate multiple server instances, provide a distributed rate limit or constitute a reliability/throughput guarantee. The lightweight status history is also process-local; browser-local evaluation history is not account-wide monitoring.
