"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { createInspectionSchema, assetTypes } from "@/lib/schemas";
import { saveInspection } from "@/lib/storage/indexeddb";
import type { InspectionCase } from "@/types/inspection";

export default function NewInspectionPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<(typeof assetTypes)[number]>("Hand pump");
  const [siteName, setSiteName] = useState("");
  const [region, setRegion] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [stage, setStage] = useState<"before" | "after">("before");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = createInspectionSchema.safeParse({ assetId, assetName, assetType, siteName, region, inspectionDate });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the required fields."); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const inspection: InspectionCase = {
      id: crypto.randomUUID(),
      ...parsed.data,
      region: parsed.data.region || undefined,
      stage,
      createdAt: now,
      updatedAt: now,
      status: "evidence_collection",
    };
    try {
      await saveInspection(inspection);
      router.push(`/inspections/${inspection.id}`);
    } catch {
      setError("This browser could not save the case. Check available device storage, then try again.");
      setSaving(false);
    }
  }

  return <>
    <PageHeader eyebrow="NEW CASE / STEP 01" title="Create an inspection" description="Record the asset and site before adding photographs. Exact coordinates and personal details are not needed." />
    <div className="form-layout">
      <form className="panel form-panel" onSubmit={submit}>
        <div className="section-label-row" style={{ marginBottom: 16 }}><h2 className="section-label">Asset record</h2><span className="section-note">Required fields marked *</span></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="assetId">Asset ID *</label><input id="assetId" value={assetId} onChange={(event) => setAssetId(event.target.value)} placeholder="e.g. WP-024" autoComplete="off" required maxLength={80} /></div>
          <div className="form-field"><label htmlFor="assetName">Asset name *</label><input id="assetName" value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="e.g. Kijani village hand pump" required maxLength={120} /></div>
          <div className="form-field"><label htmlFor="assetType">Asset type *</label><select id="assetType" value={assetType} onChange={(event) => setAssetType(event.target.value as (typeof assetTypes)[number])}>{assetTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div className="form-field"><label htmlFor="siteName">Site or community *</label><input id="siteName" value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Community or site name" required maxLength={120} /></div>
          <div className="form-field"><label htmlFor="region">County or region <span className="field-help">(optional)</span></label><input id="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="e.g. Kitui County" maxLength={120} /></div>
          <div className="form-field"><label htmlFor="inspectionDate">Inspection date *</label><input id="inspectionDate" type="date" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} required /></div>
          <div className="form-field full"><label>Inspection stage *</label><select value={stage} onChange={(event) => setStage(event.target.value as "before" | "after")} aria-label="Inspection stage"><option value="before">BEFORE REPAIR</option><option value="after">AFTER REPAIR</option></select><span className="field-help">You can add the other stage from the case workspace.</span></div>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 15 }}>{error}</p>}
        <div className="form-submit"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving case…" : <>Create case <ArrowRight size={14} /></>}</button><span className="field-help">Stored in this browser.</span></div>
      </form>
      <aside style={{ display: "grid", gap: 12 }}>
        <div className="info-note"><strong><Droplets size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />A record of observable evidence</strong>MajiProof can describe what appears in a photo. A visual observation is not an engineering diagnosis or a water-safety test.</div>
        <div className="info-note" style={{ borderColor: "#c6a05a", background: "#f6f0e2", color: "#76633f" }}><strong><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Human decisions stay separate</strong>Only a reviewer can record a manual approval or request further evidence. Model output never marks maintenance complete.</div>
      </aside>
    </div>
  </>;
}
