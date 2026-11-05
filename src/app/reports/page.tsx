"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Download, FileText } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { getInspectionBundle, listInspections } from "@/lib/storage/indexeddb";
import { downloadInspectionReport } from "@/lib/pdf/report-generator";
import { isReviewCurrent } from "@/lib/review";
import type { InspectionBundle, InspectionCase } from "@/types/inspection";

export default function ReportsPage() {
  const [cases, setCases] = useState<InspectionCase[]>([]);
  const [bundles, setBundles] = useState<Record<string, InspectionBundle>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const records = await listInspections();
      setCases(records);
      const results = await Promise.all(records.map((record) => getInspectionBundle(record.id)));
      setBundles(Object.fromEntries(results.filter((item): item is InspectionBundle => Boolean(item)).map((item) => [item.inspection.id, item])));
    } catch { setLoadError("Local inspection records could not be read. Check browser storage settings and retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  async function download(bundle: InspectionBundle) {
    setActionError(""); setDownloading(bundle.inspection.id);
    try { await downloadInspectionReport(bundle); }
    catch { setActionError("The report could not be generated. Check browser download permissions and retry."); }
    finally { setDownloading(""); }
  }

  return <>
    <PageHeader eyebrow="REPORT LIBRARY" title="Inspection reports" description="Generate a case report from locally stored photographs, real model results, and any human review on record." />
    {actionError && <div className="inline-error" role="alert" style={{ marginBottom: 13 }}>{actionError}</div>}
    <section className="panel">
      <div className="panel-heading"><div><h2 className="section-label">Saved inspection records</h2><div className="section-note">{loading ? "Loading" : loadError ? "Unavailable" : `${cases.length} stored ${cases.length === 1 ? "case" : "cases"}`}</div></div><FileText size={16} color="#648776" /></div>
      {loading ? <div className="panel-body"><div className="loading-line"><span className="spinner" />Reading local records…</div></div> : loadError ? <div className="panel-body"><div className="inline-error" role="alert">{loadError}</div><button className="btn btn-secondary btn-small" style={{ marginTop: 11 }} onClick={() => void loadRecords()}>Retry local read</button></div> : cases.length === 0 ? <EmptyState title="No reports to generate" body="Create an inspection and add evidence to prepare a downloadable PDF report." action={<Link className="btn btn-primary btn-small" href="/inspections/new">Create an inspection</Link>} /> : <div className="case-list">{cases.map((item) => {
        const bundle = bundles[item.id];
        return <div className="case-list-row" key={item.id}>
          <span className="case-primary"><strong>{item.assetName}</strong><small>{item.assetId} · {item.assetType} · {bundle?.evidence.length ?? 0} photo(s)</small></span>
          <span className="case-cell">{item.siteName}<small>{formatDate(item.inspectionDate)}</small></span>
          <span><StatusBadge status={item.status} /></span>
          <span className="case-cell">{bundle?.review ? `${isReviewCurrent(bundle.review, bundle.evidence, bundle.comparison) ? "Current" : "Prior"}: ${bundle.review.decision.replaceAll("_", " ")}` : "No review"}</span>
          <button className="icon-button" type="button" title="Download PDF report" aria-label={`Download PDF report for ${item.assetName}`} disabled={!bundle?.evidence.length || downloading === item.id} onClick={() => bundle && void download(bundle)}>{downloading === item.id ? <span className="spinner" /> : <Download size={14} color="#456d58" />}</button>
          <span className="case-cell" style={{ gridColumn: "1 / -1", paddingTop: 1 }}><Link className="arrow-link" href={`/inspections/${item.id}`}>Open inspection workspace <ArrowRight size={13} /></Link></span>
        </div>;
      })}</div>}
    </section>
  </>;
}
