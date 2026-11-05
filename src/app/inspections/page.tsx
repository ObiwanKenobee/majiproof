"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { listInspections } from "@/lib/storage/indexeddb";
import type { InspectionCase } from "@/types/inspection";

export default function InspectionsPage() {
  const [cases, setCases] = useState<InspectionCase[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true); setLoadError("");
    try { setCases(await listInspections()); }
    catch { setLoadError("Local inspection records could not be read. Check browser storage settings and retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cases;
    return cases.filter((item) => [item.assetName, item.assetId, item.assetType, item.siteName, item.region].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [cases, query]);

  return <>
    <PageHeader eyebrow="CASE REGISTER" title="Inspections" description="Every case is a dated record of submitted evidence—not an automatic statement of repair status." actions={<Link href="/inspections/new" className="btn btn-primary"><Plus size={15} />New inspection</Link>} />
    <section className="panel">
      <div className="list-toolbar">
        <div className="section-label-row"><h2 className="section-label">Inspection register</h2><span className="section-note">{loading ? "Loading" : loadError ? "Unavailable" : `${filtered.length} ${filtered.length === 1 ? "case" : "cases"}`}</span></div>
        <label className="search-field"><Search size={14} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by asset, ID or site" aria-label="Search inspections" /></label>
      </div>
      {loading ? <div className="panel-body"><div className="loading-line"><span className="spinner" />Reading local records…</div></div> : loadError ? <div className="panel-body"><div className="inline-error" role="alert">{loadError}</div><button className="btn btn-secondary btn-small" style={{ marginTop: 11 }} onClick={() => void loadRecords()}>Retry local read</button></div> : filtered.length === 0 ? <EmptyState title={cases.length ? "No matching inspections" : "No inspection records yet"} body={cases.length ? "Try another asset name, case ID or site." : "Create a case to start collecting dated, stage-specific evidence."} action={cases.length ? undefined : <Link className="btn btn-primary btn-small" href="/inspections/new"><Plus size={13} />Create first case</Link>} /> : <>
        <div className="case-list-row list-header"><span>ASSET / CASE ID</span><span>SITE</span><span>STATUS</span><span>UPDATED</span><span /></div>
        <div className="case-list">{filtered.map((item) => <Link key={item.id} href={`/inspections/${item.id}`} className="case-list-row">
          <span className="case-primary"><strong>{item.assetName}</strong><small>{item.assetId} · {item.assetType}</small></span>
          <span className="case-cell">{item.siteName}<small>{item.region || "Region not provided"}</small></span>
          <span><StatusBadge status={item.status} /></span>
          <span className="case-cell">{formatDate(item.updatedAt)}</span>
          <ArrowRight size={15} color="#759184" aria-hidden="true" />
        </Link>)}</div>
      </>}
    </section>
  </>;
}
