"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, CircleHelp, FileImage, FileText, RefreshCw, ScanSearch, ShieldCheck, Trash2, Upload, Waves } from "lucide-react";
import { EvidencePhoto } from "@/components/evidence-photo";
import { StatusBadge, formatDate } from "@/components/ui";
import { deleteComparison, deleteEvidence, getInspectionBundle, saveComparison, saveEvidence, saveInspection, saveReview } from "@/lib/storage/indexeddb";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import type { AIAnalysis, EvidenceStage, EvidenceWithBlob, HumanReview, InspectionBundle, InspectionCase, SegmentArtifact } from "@/types/inspection";
import { downloadInspectionReport } from "@/lib/pdf/report-generator";
import { isReviewCurrent } from "@/lib/review";
import { persistInferenceLog } from "@/lib/ai/client-log";

const outcomeLabels = {
  change_observed: "Change observed",
  needs_attention: "Needs attention",
  insufficient_evidence: "Insufficient evidence",
  ready_for_human_review: "Ready for human review",
} as const;

const decisionLabels = {
  approved: "Evidence approved for this record",
  additional_evidence_required: "Additional evidence required",
  issue_flagged: "Unresolved issue flagged",
} as const;

function readImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      if (dimensions.width > 0 && dimensions.height > 0) resolve(dimensions);
      else reject(new Error("This file does not contain a readable image."));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file could not be decoded as a JPEG, PNG or WebP image."));
    };
    image.src = url;
  });
}

function compactAnalysis(analysis?: AIAnalysis): string {
  if (!analysis) return "No stored Muse Spark analysis.";
  return JSON.stringify({
    sceneSummary: analysis.sceneSummary.slice(0, 240),
    visibleFlow: analysis.visibleFlow,
    visibleConditions: analysis.visibleConditions.slice(0, 2).map((condition) => ({
      label: condition.label.slice(0, 60),
      observation: condition.description.slice(0, 120),
      evidence: condition.evidenceExplanation.slice(0, 120),
      confidence: condition.confidence,
    })),
    missingEvidence: analysis.missingEvidence.slice(0, 2).map((item) => item.slice(0, 80)),
    limitations: analysis.limitations.slice(0, 2).map((item) => item.slice(0, 80)),
  });
}

export function InspectionWorkspace({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [bundle, setBundle] = useState<InspectionBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [stageErrors, setStageErrors] = useState<Partial<Record<EvidenceStage, string>>>({});
  const [busyAnalysis, setBusyAnalysis] = useState<EvidenceStage | null>(null);
  const [busySegment, setBusySegment] = useState("");
  const [busyCompare, setBusyCompare] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState<Record<EvidenceStage, boolean>>({ before: true, after: true });
  const [notes, setNotes] = useState<Record<EvidenceStage, string>>({ before: "", after: "" });
  const [reviewerName, setReviewerName] = useState("");
  const [reviewDecision, setReviewDecision] = useState<HumanReview["decision"]>("approved");
  const [reviewComments, setReviewComments] = useState("");
  const [reporting, setReporting] = useState(false);
  const [logWarning, setLogWarning] = useState("");

  async function persistResponseLog(result: unknown) {
    if (!result || typeof result !== "object" || !("inference" in result)) return;
    try {
      const saved = await persistInferenceLog(result.inference);
      if (!saved) setLogWarning("The model response was received, but its safe usage record did not pass local validation.");
    } catch {
      setLogWarning("The model response was received, but its usage record could not be saved in this browser.");
    }
  }

  const reload = useCallback(async () => {
    try {
      const result = await getInspectionBundle(inspectionId);
      if (!result) { setMissing(true); return; }
      setBundle(result);
      setMissing(false);
      const before = result.evidence.find((item) => item.stage === "before");
      const after = result.evidence.find((item) => item.stage === "after");
      setNotes({ before: before?.description ?? "", after: after?.description ?? "" });
      if (result.review) {
        setReviewerName(result.review.reviewerName ?? "");
        setReviewDecision(result.review.decision);
        setReviewComments(result.review.comments);
      }
    } catch {
      setFatalError("Local inspection storage could not be opened. Check this browser’s storage settings and reload the page.");
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => { void reload(); }, [reload]);

  const caseRecord = bundle?.inspection;
  const evidenceByStage = useMemo(() => ({
    before: bundle?.evidence.find((item) => item.stage === "before"),
    after: bundle?.evidence.find((item) => item.stage === "after"),
  }), [bundle]);
  const hasComparison = Boolean(bundle?.comparison);
  const evidenceCount = bundle?.evidence.length ?? 0;
  const stageErrorsUpdate = (stage: EvidenceStage, message: string) => setStageErrors((current) => ({ ...current, [stage]: message }));

  async function uploadEvidence(file: File, stage: EvidenceStage) {
    stageErrorsUpdate(stage, "");
    if (!ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
      stageErrorsUpdate(stage, "Choose a JPEG, PNG or WebP image."); return;
    }
    if (file.size > MAX_IMAGE_BYTES) { stageErrorsUpdate(stage, "Each photo must be 8 MB or smaller."); return; }
    if (!file.size) { stageErrorsUpdate(stage, "This image file is empty. Choose another photo."); return; }
    if (!caseRecord) return;
    try {
      const { width, height } = await readImageDimensions(file);
      if (width > 12_000 || height > 12_000 || width * height > 50_000_000) {
        stageErrorsUpdate(stage, "This photo’s decoded resolution is too large to process safely. Choose an image below 50 megapixels and 12,000 pixels per side."); return;
      }
    } catch (error) {
      stageErrorsUpdate(stage, error instanceof Error ? error.message : "This image could not be decoded. Choose another photo."); return;
    }
    const existing = evidenceByStage[stage];
    const createdAt = new Date().toISOString();
    try {
      await saveEvidence({
        id: crypto.randomUUID(),
        inspectionId,
        stage,
        fileName: file.name,
        mimeType: file.type,
        createdAt,
        description: notes[stage].trim() || undefined,
        blob: file,
      });
      if (existing) await deleteEvidence(existing.id);
      await deleteComparison(inspectionId);
      const updated = { ...caseRecord, stage, updatedAt: createdAt, status: "evidence_collection" as const };
      await saveInspection(updated);
      await reload();
    } catch {
      stageErrorsUpdate(stage, "The photo could not be saved in this browser. Keep the file and check available device storage.");
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>, stage: EvidenceStage) {
    const file = event.target.files?.[0];
    if (file) void uploadEvidence(file, stage);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>, stage: EvidenceStage) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadEvidence(file, stage);
  }

  async function saveNote(stage: EvidenceStage) {
    const evidence = evidenceByStage[stage];
    if (!evidence) return;
    await saveEvidence({ ...evidence, description: notes[stage].trim() || undefined });
    await reload();
  }

  async function runAnalysis(stage: EvidenceStage) {
    const evidence = evidenceByStage[stage];
    if (!evidence) return;
    setBusyAnalysis(stage);
    stageErrorsUpdate(stage, "");
    try {
      await saveNote(stage);
      const form = new FormData();
      form.append("image", new File([evidence.blob], evidence.fileName, { type: evidence.mimeType }));
      form.append("stage", stage);
      form.append("description", notes[stage]);
      form.append("inspectionId", inspectionId);
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const result = await response.json();
      await persistResponseLog(result);
      if (!response.ok) throw new Error(result.error || "Visual analysis failed. Your photograph is still saved.");
      const current = (await getInspectionBundle(inspectionId))?.evidence.find((item) => item.id === evidence.id);
      if (!current) throw new Error("This photo changed during analysis. Reload the case and retry.");
      await saveEvidence({ ...current, analysis: result.analysis as AIAnalysis, segmentations: [] });
      await deleteComparison(inspectionId);
      const updated = { ...caseRecord!, status: "analysis_complete" as const, updatedAt: new Date().toISOString() };
      await saveInspection(updated);
      await reload();
    } catch (error) {
      stageErrorsUpdate(stage, error instanceof Error ? error.message : "Visual analysis failed. Your photograph remains saved.");
    } finally {
      setBusyAnalysis(null);
    }
  }

  async function runSegmentation(stage: EvidenceStage, prompt: string) {
    const evidence = evidenceByStage[stage];
    if (!evidence) return;
    if ((evidence.segmentAttempts?.length ?? 0) >= 2) { stageErrorsUpdate(stage, "This photo has reached the two-prompt limit. Use another image to start a new segmentation run."); return; }
    const busyKey = `${stage}:${prompt}`;
    setBusySegment(busyKey);
    stageErrorsUpdate(stage, "");
    try {
      const form = new FormData();
      form.append("image", new File([evidence.blob], evidence.fileName, { type: evidence.mimeType }));
      form.append("prompt", prompt);
      form.append("stage", stage);
      form.append("inspectionId", inspectionId);
      const response = await fetch("/api/segment", { method: "POST", body: form });
      const result = await response.json();
      await persistResponseLog(result);
      if (!response.ok) throw new Error(result.error || "Segmentation is unavailable. The visual analysis remains saved.");
      const current = (await getInspectionBundle(inspectionId))?.evidence.find((item) => item.id === evidence.id);
      if (!current) throw new Error("This photo changed during segmentation. Reload the case and retry.");
      const attempts = [...(current.segmentAttempts ?? []), { prompt, noMatches: Boolean(result.noMatches), completedAt: new Date().toISOString() }].slice(0, 2);
      if (result.noMatches) {
        await saveEvidence({ ...current, segmentAttempts: attempts });
        await deleteComparison(inspectionId);
        if (caseRecord) await saveInspection({ ...caseRecord, status: "analysis_complete", updatedAt: new Date().toISOString() });
        await reload();
        stageErrorsUpdate(stage, `SAM 3.1 completed and did not detect a match for “${prompt}”. No mask was created.`);
        return;
      }
      const combined: SegmentArtifact[] = [...(current.segmentations ?? []), ...(result.segmentations as SegmentArtifact[])].slice(0, 2);
      await saveEvidence({ ...current, segmentations: combined, segmentAttempts: attempts });
      await deleteComparison(inspectionId);
      if (caseRecord) await saveInspection({ ...caseRecord, status: "analysis_complete", updatedAt: new Date().toISOString() });
      await reload();
    } catch (error) {
      stageErrorsUpdate(stage, error instanceof Error ? error.message : "SAM 3.1 could not complete this request. The saved analysis is still available.");
    } finally {
      setBusySegment("");
    }
  }

  async function runComparison() {
    const before = evidenceByStage.before;
    const after = evidenceByStage.after;
    if (!before || !after) return;
    setBusyCompare(true);
    setFatalError("");
    try {
      const form = new FormData();
      form.append("before", new File([before.blob], before.fileName, { type: before.mimeType }));
      form.append("after", new File([after.blob], after.fileName, { type: after.mimeType }));
      form.append("inspectionId", inspectionId);
      form.append("assetDescription", `${caseRecord?.assetName} (${caseRecord?.assetId}), ${caseRecord?.assetType}, site ${caseRecord?.siteName}${caseRecord?.region ? `, ${caseRecord.region}` : ""}.`);
      form.append("beforeFindings", compactAnalysis(before.analysis));
      form.append("afterFindings", compactAnalysis(after.analysis));
      const response = await fetch("/api/compare", { method: "POST", body: form });
      const result = await response.json();
      await persistResponseLog(result);
      if (!response.ok) throw new Error(result.error || "Comparison failed. Both photos are still stored in this case.");
      await saveComparison(inspectionId, result.comparison);
      if (caseRecord) await saveInspection({ ...caseRecord, status: "ready_for_review", updatedAt: new Date().toISOString() });
      await reload();
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "Comparison failed. Both photos remain saved.");
    } finally {
      setBusyCompare(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseRecord) return;
    if (reviewDecision === "approved" && (!evidenceByStage.before || !evidenceByStage.after || !bundle?.comparison)) {
      setFatalError("Add both before and after photographs and complete their comparison before approving this evidence record.");
      return;
    }
    setSavingReview(true);
    setFatalError("");
    const record: HumanReview = {
      id: crypto.randomUUID(),
      inspectionId,
      evidenceIds: (bundle?.evidence ?? []).filter((item) => item.stage === "before" || item.stage === "after").map((item) => item.id).sort(),
      comparisonSnapshot: JSON.stringify(bundle?.comparison ?? null),
      reviewerName: reviewerName.trim() || undefined,
      decision: reviewDecision,
      comments: reviewComments.trim(),
      reviewedAt: new Date().toISOString(),
    };
    try {
      await saveReview(record);
      const nextStatus = reviewDecision === "approved" ? "approved" : "requires_followup";
      await saveInspection({ ...caseRecord, status: nextStatus, updatedAt: record.reviewedAt });
      await reload();
    } catch {
      setFatalError("The human review could not be saved to this browser. Please retry.");
    } finally { setSavingReview(false); }
  }

  async function removeEvidence(stage: EvidenceStage) {
    const evidence = evidenceByStage[stage];
    if (!evidence) return;
    await deleteEvidence(evidence.id);
    await deleteComparison(inspectionId);
    const current = caseRecord;
    if (current) await saveInspection({ ...current, status: "evidence_collection", updatedAt: new Date().toISOString() });
    await reload();
  }

  async function createReport() {
    if (!bundle) return;
    setReporting(true);
    try { await downloadInspectionReport(bundle); }
    catch { setFatalError("The PDF could not be generated. Check that this browser allows downloads, then retry."); }
    finally { setReporting(false); }
  }

  if (loading) return <div className="panel-body"><div className="loading-line"><span className="spinner" />Opening local inspection record…</div></div>;
  if (missing) return <div className="panel"><div className="empty-state"><h3>Inspection not found on this device</h3><p>This case may have been removed or created in another browser.</p><Link className="btn btn-secondary btn-small" href="/inspections"><ArrowLeft size={13} />Back to inspections</Link></div></div>;
  if (!caseRecord || fatalError && !bundle) return <div className="inline-error" role="alert">{fatalError || "This inspection is unavailable."}</div>;

  const before = evidenceByStage.before;
  const after = evidenceByStage.after;
  const approvalReady = Boolean(before && after && bundle?.comparison);
  const reviewCurrent = isReviewCurrent(bundle?.review, bundle?.evidence ?? [], bundle?.comparison);
  const completedSteps = [Boolean(caseRecord.assetId), Boolean(before), Boolean(before?.analysis), Boolean(before?.segmentAttempts?.length), Boolean(after), Boolean(bundle?.comparison), reviewCurrent];

  return <>
    <div className="workspace-top">
      <div>
        <Link href="/inspections" className="arrow-link"><ArrowLeft size={14} /> Inspection register</Link>
        <div className="workspace-id"><span>CASE {caseRecord.assetId}</span><span>·</span><span>{caseRecord.siteName}</span><span>·</span><span>{caseRecord.assetType}</span></div>
        <h1 style={{ margin: "7px 0 0", font: "400 clamp(25px,3vw,32px)/1.2 var(--serif)", letterSpacing: "-.04em" }}>{caseRecord.assetName}</h1>
      </div>
      <StatusBadge status={caseRecord.status} />
    </div>
    <div className="stage-rail" aria-label="Inspection workflow">
      {["Asset record", "Before evidence", "AI findings", "Segmentation", "After evidence", "Comparison", "Human review"].map((title, index) => <div className={`stage-item${completedSteps[index] ? " done" : index === completedSteps.findIndex((done) => !done) ? " active" : ""}`} key={title}>
        <span className="stage-index">{completedSteps[index] ? <Check size={11} /> : String(index + 1).padStart(2, "0")}</span><span>{title}</span>
      </div>)}
    </div>
    {fatalError && <div className="inline-error" role="alert" style={{ marginBottom: 12 }}>{fatalError}</div>}
    {logWarning && <div className="inline-warning" role="status" style={{ marginBottom: 12 }}>{logWarning}</div>}

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">01</span><div><h2>Asset information</h2><p>Case record and inspection context</p></div></div><span className="section-note">Created {formatDate(caseRecord.createdAt)}</span></div>
      <div className="workspace-section-body"><div className="asset-facts">
        <div className="asset-fact"><small>ASSET ID</small><strong>{caseRecord.assetId}</strong></div>
        <div className="asset-fact"><small>ASSET TYPE</small><strong>{caseRecord.assetType}</strong></div>
        <div className="asset-fact"><small>SITE / COMMUNITY</small><strong>{caseRecord.siteName}</strong></div>
        <div className="asset-fact"><small>COUNTY / REGION</small><strong>{caseRecord.region || "Not provided"}</strong></div>
        <div className="asset-fact"><small>INSPECTION DATE</small><strong>{formatDate(caseRecord.inspectionDate)}</strong></div>
      </div></div>
    </section>

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">02</span><div><h2>Before-repair evidence</h2><p>Original photograph, field note and visual analysis</p></div></div><span className="evidence-stage">BEFORE REPAIR</span></div>
      <div className="workspace-section-body"><EvidenceStageCard stage="before" evidence={before} note={notes.before} setNote={(value) => setNotes((current) => ({ ...current, before: value }))} error={stageErrors.before} busyAnalysis={busyAnalysis === "before"} busySegment={busySegment} overlayVisible={overlayVisible.before} setOverlayVisible={(value) => setOverlayVisible((current) => ({ ...current, before: value }))} onFileChange={(event) => onFileChange(event, "before")} onDrop={(event) => onDrop(event, "before")} onAnalyze={() => void runAnalysis("before")} onSegment={(prompt) => void runSegmentation("before", prompt)} onSaveNote={() => void saveNote("before")} onRemove={() => void removeEvidence("before")} /></div>
    </section>

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">03</span><div><h2>After-repair evidence</h2><p>Capture the second stage with a comparable view where practical</p></div></div><span className="evidence-stage after">AFTER REPAIR</span></div>
      <div className="workspace-section-body"><EvidenceStageCard stage="after" evidence={after} note={notes.after} setNote={(value) => setNotes((current) => ({ ...current, after: value }))} error={stageErrors.after} busyAnalysis={busyAnalysis === "after"} busySegment={busySegment} overlayVisible={overlayVisible.after} setOverlayVisible={(value) => setOverlayVisible((current) => ({ ...current, after: value }))} onFileChange={(event) => onFileChange(event, "after")} onDrop={(event) => onDrop(event, "after")} onAnalyze={() => void runAnalysis("after")} onSegment={(prompt) => void runSegmentation("after", prompt)} onSaveNote={() => void saveNote("after")} onRemove={() => void removeEvidence("after")} /></div>
    </section>

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">04</span><div><h2>Before-and-after comparison</h2><p>Model-assisted observations from the two submitted photographs</p></div></div><span className="section-note">{before && after ? "Both stages available" : "Requires before and after photos"}</span></div>
      <div className="workspace-section-body">
        {bundle?.comparison ? <ComparisonResult result={bundle.comparison} /> : <div className="comparison-result">
          <div className="comparison-outcome insufficient_evidence"><span>AI COMPARISON</span><strong>Not run</strong></div>
          <div className="comparison-summary">A comparison requires both stage photographs. The model will report only visible differences and evidence limits; it cannot certify a repair.</div>
        </div>}
        {before && after && <div style={{ marginTop: 13 }}><button className="btn btn-primary btn-small" disabled={busyCompare} onClick={() => void runComparison()}>{busyCompare ? <><span className="spinner" />Comparing both photos…</> : <><RefreshCw size={13} />{hasComparison ? "Run comparison again" : "Compare both photos"}</>}</button></div>}
      </div>
    </section>

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">05</span><div><h2>Human supervisor review</h2><p>Manual decision is recorded separately from AI findings</p></div></div><ShieldCheck size={16} color="#648776" /></div>
      <div className="workspace-section-body">
        <div className="human-review-grid">
          <div className="review-status"><strong>Supervisor decision</strong>AI observations and comparison do not approve or certify this work. Record your assessment of the submitted evidence below.{bundle?.review && <p className="review-record" style={{ marginTop: 11 }}><strong>{reviewCurrent ? "Current evidence decision" : "Prior decision — review the changed evidence again"}: {decisionLabels[bundle.review.decision]}</strong><br />{bundle.review.reviewerName ? `${bundle.review.reviewerName} · ` : ""}{formatDate(bundle.review.reviewedAt)}{bundle.review.comments ? <><br />“{bundle.review.comments}”</> : ""}</p>}</div>
          <form className="human-review-form" onSubmit={(event) => void submitReview(event)}>
            <div className="form-field"><label htmlFor="reviewerName">Reviewer name <span className="field-help">(optional)</span></label><input id="reviewerName" value={reviewerName} maxLength={120} onChange={(event) => setReviewerName(event.target.value)} placeholder="Name or role" /></div>
            <div className="form-field"><label htmlFor="reviewDecision">Manual decision *</label><select id="reviewDecision" value={reviewDecision} onChange={(event) => setReviewDecision(event.target.value as HumanReview["decision"])}><option value="approved" disabled={!approvalReady}>Approve evidence for this record</option><option value="additional_evidence_required">Request additional evidence</option><option value="issue_flagged">Flag an unresolved issue</option></select>{!approvalReady && <span className="field-help">Approval unlocks after both stage photographs have been compared. You can still request evidence or flag an issue.</span>}</div>
            <div className="form-field"><label htmlFor="reviewComments">Supervisor comments</label><textarea id="reviewComments" maxLength={2000} value={reviewComments} onChange={(event) => setReviewComments(event.target.value)} placeholder="Record what you confirmed in person, or what remains unresolved." /></div>
            <div><button className="btn btn-primary btn-small" type="submit" disabled={savingReview || (reviewDecision === "approved" && !approvalReady)}>{savingReview ? "Saving human decision…" : <><CheckCircle2 size={13} />Save human review</>}</button></div>
          </form>
        </div>
      </div>
    </section>

    <section className="workspace-section">
      <div className="workspace-section-head"><div className="workspace-section-title"><span className="workspace-step">06</span><div><h2>Inspection report</h2><p>Download the evidence and decisions currently saved in this case</p></div></div><FileText size={15} color="#648776" /></div>
      <div className="workspace-section-body"><div className="report-footer"><div className="disclaimer">The report labels model-generated content separately from the recorded human decision. It does not certify engineering performance, water safety, reliability or repair completion.</div><button className="btn btn-secondary btn-small" onClick={() => void createReport()} disabled={reporting || !evidenceCount}>{reporting ? "Preparing PDF…" : <><FileText size={13} />Download inspection PDF</>}</button></div></div>
    </section>
    <div style={{ paddingTop: 5, color: "#8a958d", fontSize: 9 }}><Waves size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />MajiProof · OBSERVE → UNDERSTAND → SEGMENT → COMPARE → VERIFY</div>
  </>;
}

function EvidenceStageCard({
  stage, evidence, note, setNote, error, busyAnalysis, busySegment, overlayVisible, setOverlayVisible,
  onFileChange, onDrop, onAnalyze, onSegment, onSaveNote, onRemove,
}: {
  stage: EvidenceStage;
  evidence?: EvidenceWithBlob;
  note: string;
  setNote: (value: string) => void;
  error?: string;
  busyAnalysis: boolean;
  busySegment: string;
  overlayVisible: boolean;
  setOverlayVisible: (value: boolean) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onAnalyze: () => void;
  onSegment: (prompt: string) => void;
  onSaveNote: () => void;
  onRemove: () => void;
}) {
  const before = stage === "before";
  const label = before ? "Before" : "After";
  const analysis = evidence?.analysis;
  const segments = evidence?.segmentations ?? [];
  const attempts = evidence?.segmentAttempts ?? [];
  const prompts = Array.from(new Set((analysis?.visibleConditions ?? []).map((condition) => condition.samPrompt?.trim()).filter((prompt): prompt is string => Boolean(prompt)))).slice(0, 2);
  const inputId = `photo-${stage}`;

  return <div className="evidence-grid">
    <div className="evidence-card">
      <div className="evidence-card-head"><span className={`evidence-stage${before ? "" : " after"}`}>{before ? "BEFORE REPAIR" : "AFTER REPAIR"}</span>{evidence && <span className="section-note">{formatDate(evidence.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}</div>
      {evidence ? <EvidencePhoto blob={evidence.blob} label={`${label}-repair infrastructure evidence`} segmentations={segments} showOverlay={overlayVisible} /> : <div className="evidence-empty upload-target" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <FileImage size={21} strokeWidth={1.5} /><strong>{before ? "Add the original view" : "Add the after-repair view"}</strong><p>Drop a JPEG, PNG or WebP here, or capture one on your phone. Maximum 8 MB per photo.</p>
        <label htmlFor={inputId} className="upload-label"><Upload size={12} />Select photograph<input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFileChange} /></label>
      </div>}
      {evidence && <>
        <div className="file-meta"><span>{evidence.fileName}</span><span>{(evidence.blob.size / 1024 / 1024).toFixed(2)} MB</span></div>
        <div className="form-field" style={{ padding: "0 11px" }}><label htmlFor={`note-${stage}`}>Field note <span className="field-help">(optional, unverified)</span></label><textarea id={`note-${stage}`} className="field-note" value={note} maxLength={800} onChange={(event) => setNote(event.target.value)} onBlur={onSaveNote} placeholder="Describe the capture context; do not include personal details." /></div>
        <div className="evidence-controls">
          <button className="btn btn-primary btn-small" onClick={onAnalyze} disabled={busyAnalysis}>{busyAnalysis ? <><span className="spinner" />Analysing…</> : <><ScanSearch size={12} />{analysis ? "Run visual analysis again" : "Analyse with Muse Spark"}</>}</button>
          <label className="upload-label" htmlFor={`${inputId}-replace`}><RefreshCw size={11} />Replace<input id={`${inputId}-replace`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFileChange} /></label>
          <button className="icon-button" type="button" title="Remove photograph" aria-label={`Remove ${label.toLowerCase()} photograph`} onClick={onRemove}><Trash2 size={13} color="#a04e43" /></button>
        </div>
      </>}
      {error && <div className="inline-error" role="alert" style={{ margin: 10 }}>{error}</div>}
    </div>

    <div className="evidence-card">
      <div className="evidence-card-head"><span className="section-label">{analysis ? "Muse Spark findings" : "Visual inspection"}</span><span className="section-note">{analysis ? "AI-generated · muse-spark-1.3" : "No model result yet"}</span></div>
      {!evidence ? <div className="evidence-empty"><CircleHelp size={19} /><strong>Photograph required</strong><p>Keep observations tied to a saved image.</p></div> : !analysis ? <div className="evidence-empty"><ScanSearch size={20} /><strong>Ready for visual analysis</strong><p>Send this photo to Muse Spark 1.3. Missing credentials, billing or model access produce an actionable error; the image remains saved.</p>{busyAnalysis && <span className="loading-line"><span className="spinner" />Request in progress</span>}</div> : <div style={{ padding: 12 }}>
        <div className="ai-summary"><strong>Scene summary</strong>{analysis.sceneSummary}</div>
        <div className="flow-line"><span className={`flow-indicator ${analysis.visibleFlow}`} />Visible flow: <b style={{ color: "#495b50", fontWeight: 600 }}>{analysis.visibleFlow.replaceAll("_", " ")}</b><span className="section-note">Not a water-quality or supply test</span></div>
        <div className="condition-list">
          {analysis.visibleConditions.length === 0 ? <div className="condition-item"><div className="condition-evidence">The model returned no visible conditions. This is not evidence that the asset has no underlying fault.</div></div> : analysis.visibleConditions.map((condition) => <article className="condition-item" key={condition.id}>
            <div className="condition-head"><div><h3>{condition.label}</h3><small className="condition-id">Finding {condition.id}</small></div><span className={`confidence ${condition.confidence}`}>{condition.confidence}</span></div>
            <p>{condition.description}</p><div className="condition-evidence"><b>Evidence:</b> {condition.evidenceExplanation}</div>
            {condition.requiresHumanInspection && <div className="human-needed"><AlertTriangle size={12} />Further human inspection suggested</div>}
            {condition.samPrompt && <div className="segment-controls"><button className="segment-button" disabled={Boolean(busySegment) || attempts.length >= 2 || attempts.some((attempt) => attempt.prompt === condition.samPrompt)} onClick={() => onSegment(condition.samPrompt!)}>{busySegment === `${stage}:${condition.samPrompt}` ? <><span className="spinner" />Segmenting…</> : <><ScanSearch size={11} />Segment “{condition.samPrompt}”</>}</button></div>}
          </article>)}
        </div>
        <div className="two-column-list">
          <SimpleList title="Evidence gaps" items={analysis.missingEvidence} emptyText="No gaps named by the model." />
          <SimpleList title="Suggested inspection actions" items={analysis.suggestedActions} emptyText="No actions suggested." />
        </div>
        {analysis.limitations.length > 0 && <SimpleList title="Limitations" items={analysis.limitations} emptyText="" />}
        {segments.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12, padding: "9px 0", borderTop: "1px solid #e6e9e2" }}>
          <label className="overlay-toggle"><input type="checkbox" checked={overlayVisible} onChange={(event) => setOverlayVisible(event.target.checked)} />Show actual SAM mask and box</label><span className="segment-key"><i className="mask-chip" />{segments.length} segmentation result{segments.length === 1 ? "" : "s"}</span>
        </div>}
        {attempts.filter((attempt) => attempt.noMatches).map((attempt) => <div className="section-note" key={attempt.prompt} style={{ marginTop: 7 }}>SAM completed; no match detected for “{attempt.prompt}”.</div>)}
        {attempts.length < 2 && prompts.length > 0 && <div className="segment-controls" aria-label="Suggested SAM segmentation prompts">{prompts.filter((prompt) => !attempts.some((attempt) => attempt.prompt === prompt)).map((prompt) => <button className="segment-button" key={prompt} disabled={Boolean(busySegment)} onClick={() => onSegment(prompt)}><ScanSearch size={11} />Segment: {prompt}</button>)}</div>}
        {attempts.length >= 2 && <div className="section-note" style={{ marginTop: 8 }}>Two prompts completed for this image. Replace the photo to start a new segmentation run.</div>}
      </div>}
    </div>
  </div>;
}

function SimpleList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return <div className="simple-list-block"><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <div className="section-note">{emptyText}</div>}</div>;
}

function ComparisonResult({ result }: { result: NonNullable<InspectionBundle["comparison"]> }) {
  return <>
    <div className="comparison-result">
      <div className={`comparison-outcome ${result.outcome}`}><span>AI COMPARISON</span><strong>{outcomeLabels[result.outcome]}</strong></div>
      <div className="comparison-summary"><b style={{ color: "#3f4e45" }}>Observable summary · AI-generated</b><br />{result.summary}<div className="flow-line" style={{ marginTop: 11 }}>Photographed flow — before: <b>{result.beforeVisibleFlow?.replaceAll("_", " ") ?? "unclear"}</b>; after: <b>{result.afterVisibleFlow?.replaceAll("_", " ") ?? "unclear"}</b><span className="section-note">Visual only; not a capacity, reliability or water-quality test</span></div><div className="comparison-lists">
        <SimpleList title="Observed changes" items={result.observedChanges} emptyText="No observable changes identified." />
        <SimpleList title="Concerns that remain" items={result.persistingConcerns} emptyText="No persistent visual concerns identified." />
        <SimpleList title="Unresolved questions" items={result.unresolvedQuestions} emptyText="No unresolved questions returned." />
        <SimpleList title="Evidence limitations" items={result.evidenceLimitations} emptyText="No limitations returned." />
      </div></div>
    </div>
    <div className="disclaimer" style={{ marginTop: 12 }}>A visible water flow observation does not establish capacity, reliability, cleanliness or potability. This comparison does not automatically mark an asset repaired or verified.</div>
  </>;
}
