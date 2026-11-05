"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck, Clock3, FileText, Plus, SearchCheck, ShieldCheck } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState, formatDate } from "@/components/ui";
import { listInspections } from "@/lib/storage/indexeddb";
import type { InspectionCase } from "@/types/inspection";

export default function OverviewPage() {
  const [cases, setCases] = useState<InspectionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try { setCases(await listInspections()); }
    catch { setLoadError("Local inspection records could not be read. Check browser storage settings and retry."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const awaiting = cases.filter((item) => item.status === "ready_for_review").length;
  const followup = cases.filter((item) => item.status === "requires_followup").length;
  const recent = cases.slice(0, 5);
  const activity = cases.map((item) => {
    const createdAt = Date.parse(item.createdAt);
    const updatedAt = Date.parse(item.updatedAt);
    const hasUpdate = Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt > createdAt;
    return { item, activityAt: hasUpdate ? item.updatedAt : item.createdAt, label: hasUpdate ? "Case updated" : "Inspection created" };
  }).sort((a, b) => Date.parse(b.activityAt) - Date.parse(a.activityAt)).slice(0, 6);
  const metric = (value: number) => loading || loadError ? "—" : value;

  return <>
    <PageHeader eyebrow="OVERVIEW / FIELD EVIDENCE" title="Inspection overview" description="A clear record of what is visible, what changed, and what still needs a human decision." actions={<Link href="/inspections/new" className="btn btn-primary"><Plus size={15} />New inspection</Link>} />

    <section className="dashboard-banner" aria-label="MajiProof product principle">
      <div className="banner-copy">
        <div className="banner-kicker"><span /> VISUAL EVIDENCE · HUMAN ACCOUNTABILITY</div>
        <h2>What changed is visible.<br />What remains uncertain is recorded.</h2>
        <p>Compare field evidence with care. MajiProof supports inspection decisions; it does not certify a repair or establish water safety.</p>
      </div>
      <div className="banner-action"><Link href="/inspections/new" className="btn"><Plus size={15} />Create a case<ArrowRight size={14} /></Link></div>
    </section>

    <section className="metric-grid" aria-label="Inspection case totals">
      <div className="metric-card"><div className="metric-label">INSPECTION CASES <ClipboardCheck size={14} /></div><div className="metric-value">{metric(cases.length)}</div></div>
      <div className="metric-card"><div className="metric-label">AWAITING REVIEW <SearchCheck size={14} /></div><div className="metric-value">{metric(awaiting)}</div></div>
      <div className="metric-card"><div className="metric-label">FOLLOW-UP REQUIRED <FileText size={14} /></div><div className="metric-value">{metric(followup)}</div></div>
    </section>

    <div className="overview-grid">
      <section className="panel" aria-labelledby="recent-heading">
        <div className="panel-heading"><div><h2 className="section-label" id="recent-heading">Recent inspection cases</h2><div className="section-note">Stored on this device</div></div><Link href="/inspections" className="arrow-link">All inspections<ArrowRight size={14} /></Link></div>
        {loading ? <div className="panel-body"><div className="loading-line"><span className="spinner" />Reading local records…</div></div> : loadError ? <div className="panel-body"><div className="inline-error" role="alert">{loadError}</div><button className="btn btn-secondary btn-small" style={{ marginTop: 11 }} onClick={() => void loadRecords()}>Retry local read</button></div> : recent.length === 0 ? <EmptyState title="No inspection records yet" body="Create a case when field evidence is ready. Your first record and photographs will be stored on this device." action={<Link className="btn btn-primary btn-small" href="/inspections/new"><Plus size={13} />Create an inspection</Link>} /> : <div className="activity-list">
          {recent.map((item) => <Link className="activity-row" href={`/inspections/${item.id}`} key={item.id}>
            <div className="activity-avatar">{item.assetName.slice(0, 1).toUpperCase()}</div>
            <div className="activity-main"><strong>{item.assetName}</strong><small>{item.assetId} · {item.siteName} · {item.assetType}</small></div>
            <div className="activity-meta"><StatusBadge status={item.status} /><span className="activity-date">{formatDate(item.updatedAt, { day: "numeric", month: "short" })}</span></div>
          </Link>)}
        </div>}
      </section>
      <aside className="panel">
        <div className="panel-heading"><div><h2 className="section-label">Evidence principles</h2><div className="section-note">Built into each case</div></div><ShieldCheck size={15} color="#6c8c78" /></div>
        <div className="panel-body" style={{ display: "grid", gap: 13 }}>
          <div className="ai-summary"><strong>Observe, don’t diagnose</strong>Model findings describe visible details. They do not establish the engineering cause of a problem.</div>
          <div className="ai-summary"><strong>Compare, don’t certify</strong>A photo can show a change. Only a human reviewer records an approval decision.</div>
          <div className="ai-summary"><strong>Local by default</strong>Case records and image files remain in this browser unless submitted for model analysis.</div>
        </div>
      </aside>
    </div>
    <section className="panel activity-feed-panel" aria-labelledby="activity-heading">
      <div className="panel-heading"><div><h2 className="section-label" id="activity-heading">Recent inspection activity</h2><div className="section-note">Latest saved record updates · On this device</div></div><Clock3 size={15} color="#6c8c78" /></div>
      {loading ? <div className="panel-body"><div className="loading-line"><span className="spinner" />Reading local records…</div></div> : loadError ? <div className="panel-body"><div className="inline-error" role="alert">Recent activity is unavailable until local records can be read.</div></div> : activity.length === 0 ? <EmptyState title="No inspection activity yet" body="Create a case to start a local inspection record." /> : <div className="activity-feed" role="list">
        {activity.map(({ item, activityAt, label }) => <Link className="activity-feed-row" href={`/inspections/${item.id}`} key={item.id} role="listitem">
          <span className="activity-feed-marker" aria-hidden="true" />
          <span className="activity-feed-copy"><strong>{label} · {item.assetName}</strong><small>{item.assetId} · {item.siteName} · {item.status.replaceAll("_", " ")}</small></span>
          <time className="activity-feed-date" dateTime={activityAt}>{formatDate(activityAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
        </Link>)}
      </div>}
      <div className="activity-feed-note">Shows the latest saved timestamp per case; it is not a complete audit trail.</div>
    </section>
  </>;
}
