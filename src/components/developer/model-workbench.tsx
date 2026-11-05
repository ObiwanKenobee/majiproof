"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Check, Clock3, Database, FileImage, FlaskConical, KeyRound, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { averageLatency, matchingBenchmarkRuns } from "@/lib/ai/benchmark";
import { analysisWithAttributionSchema, benchmarkRatingSchema, benchmarkRunSchema, inferenceLogSchema } from "@/lib/ai/schemas";
import { persistInferenceLog } from "@/lib/ai/client-log";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";
import { getEvidenceForInspection, listBenchmarkRuns, listInspections, listInferenceLogs, saveBenchmarkRun, updateBenchmarkRatings } from "@/lib/storage/indexeddb";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import type { BenchmarkRatings, BenchmarkRunRecord, InferenceLogRecord, ProviderStatus } from "@/types/ai";
import type { EvidenceWithBlob, EvidenceStage, InspectionCase } from "@/types/inspection";

const providerLabels: Record<string, string> = {
  meta: "Meta Model API",
  fireworks: "Fireworks AI",
  baseten: "Baseten",
  modal: "Modal Shared Endpoint",
};
const ratingFields: Array<{ key: keyof BenchmarkRatings; label: string }> = [
  { key: "visualAccuracy", label: "Visual accuracy" },
  { key: "evidenceDiscipline", label: "Evidence discipline" },
  { key: "schemaValidity", label: "Structured-output quality" },
  { key: "technicianRelevance", label: "Technician relevance" },
  { key: "segmentationPromptRelevance", label: "SAM prompt relevance" },
];

type SelectedPhoto = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  stage: EvidenceStage;
  inspectionId?: string;
  sourceLabel: string;
};
type LocalPhotoOption = { id: string; label: string; evidence: EvidenceWithBlob; inspection: InspectionCase };
type StatusResponse = {
  providers: ProviderStatus[];
  experimentationEnabled: boolean;
  concurrency: { inFlight: number; queued: number; limit: number };
  statusScope: string;
  logScope: string;
};
type EvaluationResponse = { error?: string; analysis?: unknown; inference?: unknown; imageFingerprint?: string; promptFingerprint?: string };

async function sha256(value: Blob | string): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : await value.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, "0")).join("");
}

async function validateImageForWorkbench(file: File): Promise<void> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP photograph.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("This photograph exceeds the 8 MB limit.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth < 1 || image.naturalHeight < 1 || image.naturalWidth * image.naturalHeight > 50_000_000 || Math.max(image.naturalWidth, image.naturalHeight) > 12_000) {
      throw new Error("This photograph exceeds the supported 50-megapixel or 12,000-pixel side limit.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds")) throw error;
    throw new Error("The selected image could not be decoded.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ModelWorkbench() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState("");
  const [loading, setLoading] = useState(true);
  const [localPhotos, setLocalPhotos] = useState<LocalPhotoOption[]>([]);
  const [localRuns, setLocalRuns] = useState<BenchmarkRunRecord[]>([]);
  const [localLogs, setLocalLogs] = useState<InferenceLogRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<InferenceLogRecord[]>([]);
  const [localError, setLocalError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [stage, setStage] = useState<EvidenceStage>("before");
  const [description, setDescription] = useState("");
  const [providerId, setProviderId] = useState("meta");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fingerprints, setFingerprints] = useState<{ image: string; prompt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadStatus() {
    setStatusError("");
    try {
      const response = await fetch("/api/developer/status", { cache: "no-store" });
      const data = await response.json() as StatusResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Developer status is unavailable in this environment.");
      setStatus(data);
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : "Developer status is unavailable.");
    }
  }

  async function loadLocalData() {
    setLocalError("");
    try {
      const cases = await listInspections();
      const photoOptions: LocalPhotoOption[] = [];
      for (const inspection of cases.slice(0, 60)) {
        const evidence = await getEvidenceForInspection(inspection.id);
        for (const photo of evidence) {
          photoOptions.push({
            id: photo.id,
            label: `${inspection.assetId} · ${inspection.siteName} · ${photo.stage.toUpperCase()} · ${photo.fileName}`,
            evidence: photo,
            inspection,
          });
        }
      }
      setLocalPhotos(photoOptions);
      const [runs, logs] = await Promise.all([listBenchmarkRuns(), listInferenceLogs()]);
      setLocalRuns(runs);
      setLocalLogs(logs);
      setRecentLogs(logs.slice(0, 10));
    } catch {
      setLocalError("Browser-local cases or evaluation records could not be read. The workbench does not upload or replace them automatically.");
    }
  }

  async function refresh() {
    setLoading(true);
    await Promise.all([loadStatus(), loadLocalData()]);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!selectedPhoto) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(selectedPhoto.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPhoto?.blob]);
  useEffect(() => {
    let active = true;
    if (!selectedPhoto) { setFingerprints(null); return; }
    void Promise.all([sha256(selectedPhoto.blob), sha256(buildAnalysisPrompt(stage, description))]).then(([image, prompt]) => {
      if (active) setFingerprints({ image, prompt });
    }).catch(() => { if (active) setFingerprints(null); });
    return () => { active = false; };
  }, [selectedPhoto?.blob, stage, description]);

  const selectableStatuses = useMemo(() => status?.providers.filter((item) => item.model?.variant !== "sam-3.1") ?? [], [status]);
  const chosenStatus = selectableStatuses.find((item) => item.providerId === providerId);
  const localLatestByModel = useMemo(() => {
    const latest = new Map<string, InferenceLogRecord>();
    for (const run of localLogs) {
      const key = `${run.providerId}:${run.modelId}`;
      if (!latest.has(key)) latest.set(key, run);
    }
    return latest;
  }, [localLogs]);
  const matchingRuns = useMemo(() => {
    if (!fingerprints) return [];
    return matchingBenchmarkRuns(localRuns, fingerprints.image, fingerprints.prompt);
  }, [fingerprints, localRuns]);

  async function chooseLocalPhoto(photo: LocalPhotoOption) {
    setSelectedPhoto({
      blob: photo.evidence.blob,
      fileName: photo.evidence.fileName,
      mimeType: photo.evidence.mimeType,
      stage: photo.evidence.stage,
      inspectionId: photo.inspection.id,
      sourceLabel: `Saved local inspection ${photo.inspection.assetId}`,
    });
    setStage(photo.evidence.stage);
    setNotice("Local photo selected. It stays in this browser unless you explicitly run a model evaluation.");
    setError("");
  }

  async function chooseUploadedPhoto(file?: File) {
    if (!file) return;
    try {
      await validateImageForWorkbench(file);
      setSelectedPhoto({ blob: file, fileName: file.name, mimeType: file.type, stage, sourceLabel: "Temporary browser upload" });
      setNotice("Photo selected for this workbench session only; it has not been sent or stored.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This photo cannot be used.");
    }
  }

  async function runEvaluation() {
    if (!selectedPhoto || !chosenStatus?.enabled || !chosenStatus.model) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const prompt = buildAnalysisPrompt(stage, description);
      const [imageFingerprint, promptFingerprint] = await Promise.all([sha256(selectedPhoto.blob), sha256(prompt)]);
      const benchmarkRunId = crypto.randomUUID();
      const form = new FormData();
      form.append("image", selectedPhoto.blob, selectedPhoto.fileName);
      form.append("providerId", providerId);
      form.append("modelId", chosenStatus.model.modelId);
      form.append("stage", stage);
      form.append("description", description);
      form.append("imageFingerprint", imageFingerprint);
      form.append("promptFingerprint", promptFingerprint);
      form.append("benchmarkRunId", benchmarkRunId);
      if (selectedPhoto.inspectionId) form.append("inspectionId", selectedPhoto.inspectionId);

      const response = await fetch("/api/developer/evaluate", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({})) as EvaluationResponse;
      if (payload.inference) {
        const parsedInference = inferenceLogSchema.safeParse(payload.inference);
        if (parsedInference.success) {
          await persistInferenceLog(parsedInference.data);
          let parsedAnalysis: ReturnType<typeof analysisWithAttributionSchema.safeParse> | undefined;
          if (payload.analysis !== undefined) parsedAnalysis = analysisWithAttributionSchema.safeParse(payload.analysis);
          if (parsedAnalysis && !parsedAnalysis.success) throw new Error("The normalized model result did not match MajiProof's validated output schema.");
          const benchmark = benchmarkRunSchema.safeParse({
            ...parsedInference.data,
            stage,
            imageFingerprint,
            promptFingerprint,
            ...(parsedAnalysis?.success ? { analysis: parsedAnalysis.data } : {}),
            ratings: {},
            evaluatorNotes: "",
          });
          if (!benchmark.success) throw new Error("The evaluation record did not pass local validation and was not saved.");
          await saveBenchmarkRun(benchmark.data);
          await loadLocalData();
        } else {
          throw new Error("The response's inference metadata failed local validation and was not saved.");
        }
      }
      if (!response.ok) throw new Error(payload.error || `Evaluation failed (HTTP ${response.status}).`);
      setNotice("Validated structured output and request metadata saved locally. The photograph itself was not added to the benchmark log.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The evaluation could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveRating(run: BenchmarkRunRecord, ratings: BenchmarkRatings, notes: string) {
    try {
      const parsed = benchmarkRatingSchema.safeParse(ratings);
      if (!parsed.success) throw new Error("Choose scores from 1 to 5.");
      const updated = await updateBenchmarkRatings(run.requestId, parsed.data, notes);
      if (!updated) throw new Error("This local evaluation record was not found.");
      await loadLocalData();
      setNotice("Manual ratings and reviewer notes saved in this browser.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The evaluation could not be saved.");
    }
  }

  return <div className="workbench-page">
    <div className="workbench-intro info-note"><strong><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Developer-only evaluation controls</strong>One explicitly selected provider receives one explicitly selected photograph only after you press Run. Provider selection is not in field-user navigation. Do not use personal or unnecessary sensitive imagery. Outputs and ratings are stored in this browser; raw photographs and full prompts are excluded from inference logs.</div>

    <div className="workbench-toolbar">
      <div><span className="section-note">MODEL STATUS · PER APPLICATION PROCESS</span><h2>Provider readiness</h2></div>
      <button className="btn btn-secondary btn-small" onClick={() => void refresh()} disabled={loading}><RefreshCw size={12} />Refresh status</button>
    </div>
    {statusError && <div className="inline-error" role="alert">{statusError}</div>}
    {!statusError && status && <>
      <div className="workbench-status-grid">
        {status.providers.map((entry, index) => {
          const lastLocalRun = entry.model ? localLatestByModel.get(`${entry.providerId}:${entry.model.modelId}`) : undefined;
          const verification = lastLocalRun ? (lastLocalRun.outcome === "success" ? "available" : "failed_health_check") : entry.verification;
          const verificationLabel = lastLocalRun
            ? lastLocalRun.outcome === "success" ? `Available · local success ${new Date(lastLocalRun.completedAt).toLocaleString()}` : `Last local request failed · ${lastLocalRun.errorCategory ?? "provider error"}`
            : entry.verification.replaceAll("_", " ");
          return <article className="provider-status-card" key={`${entry.providerId}-${entry.model?.modelId ?? index}`}>
          <div className="provider-status-head"><strong>{providerLabels[entry.providerId]}</strong>{entry.fieldDefault && <span className="tag-default">FIELD DEFAULT</span>}</div>
          <div className="provider-model-name">{entry.model?.displayName ?? "Project endpoint not specified"}</div>
          {entry.model && <div className="provider-endpoint-label">{entry.model.modelId} · {entry.model.endpointLabel}</div>}
          <div className="provider-status-line"><span>Credential</span><b className={entry.configuration === "configured" ? "state-good" : "state-muted"}>{entry.configuration === "configured" ? "Configured" : "Not configured"}</b></div>
          <div className="provider-status-line"><span>Verification</span><b className={`verification-${verification}`}>{verificationLabel}</b></div>
          <p>{entry.reason ?? "This provider has no saved status details."}</p>
          {entry.lastCheck && <small className="provider-last-check">Last explicit inference check · {new Date(entry.lastCheck.at).toLocaleString()}{entry.lastCheck.errorCategory ? ` · ${entry.lastCheck.errorCategory.replaceAll("_", " ")}` : ""}</small>}
        </article>;
        })}
      </div>
      <div className="workbench-status-strip"><span><Activity size={13} />{status.concurrency.inFlight}/{status.concurrency.limit} active · {status.concurrency.queued} queued on this process</span><span>{status.experimentationEnabled ? "Evaluation enabled for this development session" : "Evaluation disabled by default"}</span></div>
      <p className="workbench-footnote">{status.statusScope} A configured key is not evidence that billing, model entitlement or project endpoint access is working. Provider-selection failures do not trigger a Meta fallback.</p>
    </>}

    <div className="workbench-section-heading"><span>01</span><div><h2>Choose a consistent test input</h2><p>Runs can be compared only when the image fingerprint and exact shared prompt fingerprint match.</p></div></div>
    {localError && <div className="inline-error" role="alert">{localError}</div>}
    <div className="workbench-input-grid">
      <section className="panel workbench-panel">
        <div className="workbench-field form-field"><label htmlFor="local-photo">Saved inspection photograph</label><select id="local-photo" value="" onChange={(event) => { const choice = localPhotos.find((item) => item.id === event.target.value); if (choice) void chooseLocalPhoto(choice); }}><option value="">Select from this browser’s saved records…</option>{localPhotos.map((photo) => <option key={photo.id} value={photo.id}>{photo.label}</option>)}</select></div>
        <div className="workbench-field form-field"><label htmlFor="new-benchmark-photo">Or choose a temporary photograph</label><label className="workbench-upload" htmlFor="new-benchmark-photo"><Upload size={13} />Choose image file<input id="new-benchmark-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void chooseUploadedPhoto(event.currentTarget.files?.[0])} /></label><span className="field-help">JPEG, PNG or WebP · max 8 MB · max 50 MP · temporary in memory until the request</span></div>
        {selectedPhoto && <>
          <div className="workbench-photo-preview">{previewUrl && <img src={previewUrl} alt="Selected inspection evidence preview" />}<div><strong>{selectedPhoto.fileName}</strong><small>{selectedPhoto.sourceLabel} · {(selectedPhoto.blob.size / 1024 / 1024).toFixed(2)} MB</small></div></div>
          <div className="workbench-field form-field"><label htmlFor="test-stage">Inspection stage</label><select id="test-stage" value={stage} onChange={(event) => setStage(event.target.value as EvidenceStage)}><option value="before">Before repair</option><option value="after">After repair</option></select></div>
          <div className="workbench-field form-field"><label htmlFor="test-description">Standard prompt context / field note</label><textarea id="test-description" maxLength={800} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Keep this context identical when comparing providers. No personal information." /></div>
        </>}
      </section>
      <section className="panel workbench-panel">
        <div className="workbench-section-heading compact"><span>02</span><div><h2>Select one model</h2><p>One request at a time · no fan-out · no automatic fallback</p></div></div>
        <div className="provider-choice-list">
          {selectableStatuses.map((entry, index) => {
            const isSelected = entry.providerId === providerId;
            return <button type="button" className={`provider-choice${isSelected ? " selected" : ""}`} disabled={!entry.enabled} key={`${entry.providerId}-${entry.model?.modelId ?? index}`} onClick={() => setProviderId(entry.providerId)}>
              <span className="provider-choice-radio" aria-hidden="true">{isSelected && <span />}</span>
              <span className="provider-choice-copy"><strong>{entry.model?.displayName ?? `${providerLabels[entry.providerId]} · endpoint not configured`}</strong><small>{entry.configuration === "configured" ? (entry.enabled ? entry.verification.replaceAll("_", " ") : "Configured · experimental runs gated") : "Not configured · no request will be sent"}</small></span>
            </button>;
          })}
        </div>
        <div className="info-note workbench-exp-note"><strong>Manual evaluation, not ground truth</strong>Review schema validity, visible-image accuracy, uncertainty discipline, technician usefulness and SAM-prompt relevance yourself. Scores do not certify repairs or establish water quality.</div>
        <button className="btn btn-primary workbench-run" onClick={() => void runEvaluation()} disabled={!selectedPhoto || !chosenStatus?.enabled || !chosenStatus.model || busy}>{busy ? <><span className="spinner" />Request running…</> : <><FlaskConical size={14} />Run one selected model</>}</button>
        {error && <div className="inline-error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
        {notice && <div className="workbench-success" role="status"><Check size={13} />{notice}</div>}
      </section>
    </div>

    <div className="workbench-section-heading"><span>03</span><div><h2>Compare saved outputs and measured requests</h2><p>Only results with the same image and exact prompt fingerprints belong in a direct cross-provider comparison.</p></div></div>
    {!selectedPhoto ? <div className="panel empty-state"><FileImage size={21} color="#769584" /><h3>Select a photograph to compare runs</h3><p>Existing local run history is available after choosing the same evidence photograph again.</p></div> : <>
      <div className="workbench-fingerprint panel"><div><small>IMAGE SHA-256</small><code>{fingerprints?.image ?? "Computing…"}</code></div><div><small>PROMPT SHA-256</small><code>{fingerprints?.prompt ?? "Computing…"}</code></div><div><small>STANDARD PROMPT</small><code>v1 · {stage.toUpperCase()} + field note + shared policy/schema</code></div></div>
      {matchingRuns.length > 0 ? <div className="benchmark-results">
        <div className="benchmark-summary"><div><strong>{matchingRuns.length}</strong><span>saved run{matchingRuns.length === 1 ? "" : "s"} for this exact photo and prompt</span></div><div><Clock3 size={14} />Mean successful latency {averageLatency(matchingRuns) === undefined ? "—" : `${averageLatency(matchingRuns)} ms`}</div></div>
        {matchingRuns.map((run) => <BenchmarkRunCard key={run.requestId} run={run} onSave={saveRating} />)}
      </div> : <div className="panel empty-state"><Database size={19} color="#769584" /><h3>No saved model runs for this selection</h3><p>Run one enabled model. Results are stored in IndexedDB; uploaded photos are not copied into the benchmark log.</p></div>}
    </>}

    <section className="panel workbench-log-panel">
      <div className="panel-heading"><div><h2 className="section-label">Recent local inference log</h2><span className="section-note">Safe metadata only · no image bytes, API keys or full prompts</span></div><Database size={15} color="#688575" /></div>
      {recentLogs.length ? <div className="workbench-log-list">{recentLogs.map((entry) => <div className="workbench-log-row" key={entry.requestId}><span className={`log-state ${entry.outcome}`}>{entry.outcome}</span><strong>{entry.modelAttribution.displayName}</strong><span>{entry.operation.replaceAll("-", " ")}</span><span>{entry.latencyMs} ms</span><span>{entry.usage ? `${entry.usage.inputTokens + entry.usage.outputTokens} tokens` : "usage not reported"}</span><code>{entry.errorCategory ?? "—"}</code></div>)}</div> : <p className="workbench-log-empty">{loading ? "Loading local inference history…" : "No model requests have been logged in this browser."}</p>}
      <p className="workbench-footnote">{status?.logScope ?? "Inference metadata is local to this browser."}</p>
    </section>
  </div>;
}

function BenchmarkRunCard({ run, onSave }: { run: BenchmarkRunRecord; onSave: (run: BenchmarkRunRecord, ratings: BenchmarkRatings, notes: string) => Promise<void> }) {
  const [ratings, setRatings] = useState<BenchmarkRatings>(run.ratings ?? {});
  const [notes, setNotes] = useState(run.evaluatorNotes ?? "");
  const [saving, setSaving] = useState(false);
  const allMatchedScores = Object.values(run.ratings ?? {}).filter((score) => typeof score === "number");
  const localQuality = allMatchedScores.length ? `${(allMatchedScores.reduce((sum, score) => sum + score, 0) / allMatchedScores.length).toFixed(1)} / 5 manual mean` : "Not rated";

  async function persist() {
    setSaving(true);
    try { await onSave(run, ratings, notes); }
    finally { setSaving(false); }
  }

  return <article className="benchmark-run panel">
    <div className="benchmark-run-head"><div><span className={`log-state ${run.outcome}`}>{run.outcome}</span><h3>{run.modelAttribution.displayName}</h3><small>{new Date(run.completedAt).toLocaleString()} · {run.latencyMs} ms total request time</small></div><div className="benchmark-run-metrics"><strong>{run.usage ? `${run.usage.inputTokens.toLocaleString()} in / ${run.usage.outputTokens.toLocaleString()} out` : "Usage not reported"}</strong><small>{run.estimatedListCostUsd === undefined ? "No list-price estimate" : `List-price estimate only · $${run.estimatedListCostUsd.toFixed(5)}`}</small></div></div>
    {run.errorCategory && <div className="inline-error run-error"><AlertTriangle size={13} />Request outcome: {run.errorCategory.replaceAll("_", " ")}. This is not a provider invoice or health guarantee.</div>}
    {run.analysis && <details className="benchmark-output"><summary>Inspect normalized structured output</summary><pre>{JSON.stringify(run.analysis, null, 2)}</pre></details>}
    {run.analysis ? <div className="workbench-human-rating"><div className="rating-heading"><strong>Human quality review</strong><span>{localQuality} · qualitative assessment, not ground truth</span></div><div className="rating-grid">{ratingFields.map(({ key, label }) => <label className="rating-field" key={key}><span>{label}</span><select value={ratings[key] ?? ""} onChange={(event) => setRatings((current) => ({ ...current, [key]: event.target.value ? Number(event.target.value) as 1 | 2 | 3 | 4 | 5 : undefined }))}><option value="">Not rated</option><option value="1">1 · weak</option><option value="2">2</option><option value="3">3 · acceptable</option><option value="4">4</option><option value="5">5 · strong</option></select></label>)}</div><label className="rating-field notes-field"><span>Review note</span><textarea maxLength={1200} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe visual accuracy, missing evidence, schema issues or technician usefulness." /></label><button className="btn btn-secondary btn-small" type="button" disabled={saving} onClick={() => void persist()}>{saving ? "Saving…" : "Save manual assessment"}</button></div> : <p className="workbench-footnote">No validated structured output is present; visual quality ratings are disabled for this failed request.</p>}
  </article>;
}
