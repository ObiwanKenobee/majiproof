# MajiProof — 90-second demo script

**Scenario:** a rural hand pump in Kenya has a reported maintenance intervention. The analysis/mask/comparison steps below are a conditional success path: run them only after Meta account billing and model access are enabled, using two real photographs supplied for the demo. Do not preload or narrate invented model findings. Current live requests returned HTTP 402 `billing_not_configured`; until that is resolved, use the fallback instead of pretending models succeeded.

| Time | Screen / action | Narration |
| --- | --- | --- |
| 0–10 sec | Overview dashboard; show zero or actual local case metrics. | “A repair report tells us work was done. MajiProof helps the supervisor see what the submitted images actually show.” |
| 10–20 sec | Create a case: real asset ID and name, Hand pump, site/community, date and optional region. | “We record an asset and site, without requiring a person’s identity or exact GPS.” |
| 20–34 sec | Upload the real BEFORE photograph, add an optional note, run Muse Spark. | “The image stays in the browser unless we ask for analysis. Findings are structured, tied to the photo, and distinguish observation from diagnosis.” |
| 34–48 sec | Pick one returned noun-phrase prompt and run SAM 3.1; toggle the mask and inspect the box. | “SAM segments the named object in the original image. This is the model’s decoded mask and bounding box—not a drawn illustration.” |
| 48–57 sec | Upload the real AFTER photograph; run the same analysis and one SAM prompt if useful. | “We keep each stage’s evidence and findings separate.” |
| 57–70 sec | Run the paired comparison; show outcome, changes, concerns and limitations. | “The comparison reports visible differences and unknowns. Flow in a photograph does not prove capacity, reliability or potability.” |
| 70–80 sec | Supervisor review panel; enter an actual review decision/comment or leave unreviewed. | “AI cannot approve the repair. A human records their own decision independently.” |
| 80–90 sec | Download PDF; point out evidence, source labels and reviewer section. | “The PDF preserves what the evidence supports, what remains uncertain and who made the final review.” |

**Fallback:** if Meta API credentials or provider billing/model access are unavailable, show Settings with the credential/provider state, retain the real uploaded photograph in the workspace, and show the actionable error. Do not show fabricated visual analysis, masks or comparison results.


## Optional developer workbench walkthrough

`/developer/models` is a separate development-only technical walkthrough, not a field-user step. Demonstrate it only after an operator has configured valid access and explicitly enabled experimentation. Use one real, permissioned, non-sensitive photo; select one provider and press Run. Compare outputs only when the displayed image and prompt fingerprints match. Show measured latency and returned token usage only when a real provider response supplies them. Manual scores are evaluator judgement. The current baseline has no successful live results and an empty benchmark manifest; do not show fabricated output to make this walkthrough look complete.
