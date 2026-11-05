# MajiProof — Project Summary

## The problem

A maintenance report may say that a rural water point was repaired, but a supervisor still needs to understand what was visible before the intervention, what changed afterward, and whether the photographs actually support the claim. Written reports alone can leave an evidence gap.

## The product

MajiProof is a visual inspection and repair-evidence record for WASH NGOs, field inspectors, water technicians and infrastructure supervisors. It brings a case record, before-and-after photographs, intended model-assisted observations, returned object masks, comparison notes and a separate human review decision into one workflow.

## What is distinctive

When provider account access is enabled, Muse Spark 1.3 is asked to interpret submitted image evidence as structured findings with explicit confidence and limitations. SAM 3.1 then segments a concrete object named in that analysis; the application parses returned SAM output into masks and bounding boxes and renders them on the original photograph. With both stages present, Muse Spark compares what is visually observable. The supervisor—not an AI-generated label—records the review decision.

## Current integration status

The Meta API key is present server-side, but live model requests during this build returned HTTP 402 `billing_not_configured`. Enable provider billing and model access before presenting a successful AI analysis, segmentation or comparison. The application returns an actionable error and does not substitute fabricated results.

## Value

The product gives field and oversight teams a clearer, reviewable account of submitted evidence. It makes visible changes easier to inspect, records what the model cannot establish, and preserves human accountability. It does not infer water safety, technical performance or repair completion from appearance.


## Phase 2 provider independence

The application has a shared provider contract, server-side explicit registry/router and normalized output schemas. Meta Muse Spark 1.3 remains the ordinary vision default. Meta SAM 3.1 remains a separate segmentation path. Fireworks and Baseten Muse Spark Open adapters are distinct experimental variants; Modal is gated on project-specific endpoint setup and image-input verification. The developer workbench is development-only and does not call models until a developer explicitly selects a provider and runs an evaluation.

This is implementation readiness, not live partner validation. The last live Meta Muse/SAM requests returned HTTP 402 `billing_not_configured`; Fireworks/Baseten credentials and a Modal project endpoint are absent. No partner or successful Meta inference is claimed. The benchmark manifest remains empty because no permissioned case imagery and human labels were supplied. See [MODEL_BENCHMARK.md](./MODEL_BENCHMARK.md) and [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).
