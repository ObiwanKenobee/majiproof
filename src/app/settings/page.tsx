"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/ui";

type ModelStatus = "checking" | "present" | "missing" | "unavailable";

export default function SettingsPage() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>("checking");
  const [storage, setStorage] = useState<string>("Checking browser storage…");

  useEffect(() => {
    fetch("/api/health").then((response) => {
      if (!response.ok) throw new Error("Health status unavailable");
      return response.json();
    }).then((data) => setModelStatus(data.modelConfigured ? "present" : "missing")).catch(() => setModelStatus("unavailable"));
    if (navigator.storage?.estimate) navigator.storage.estimate().then((estimate) => {
      const used = estimate.usage ? `${(estimate.usage / 1024 / 1024).toFixed(1)} MB used` : "Usage not reported";
      const quota = estimate.quota ? ` · ${(estimate.quota / 1024 / 1024).toFixed(0)} MB available` : "";
      setStorage(`${used}${quota}`);
    }).catch(() => setStorage("Browser did not report storage usage."));
    else setStorage("Browser storage estimate unavailable.");
  }, []);

  const keyStatus = modelStatus === "checking" ? "Checking" : modelStatus === "present" ? "Key present" : modelStatus === "missing" ? "Not configured" : "Status unavailable";

  return <>
    <PageHeader eyebrow="PREFERENCES & CONNECTIVITY" title="Settings" description="MajiProof uses this device for case records and keeps model credentials on the server." />
    <div className="settings-grid">
      <section className="settings-panel">
        <h2><KeyRound size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />Meta Model API</h2>
        <p>Muse Spark 1.3 provides visual analysis and photo comparison. SAM 3.1 creates actual masks and boxes. The same server-side MODEL_API_KEY is used for both and is never sent to the browser.</p>
        <div className="setting-row"><div><strong>MODEL_API_KEY</strong><small>Protected project environment value</small></div><span className={`setting-state${modelStatus === "present" ? " is-ready" : ""}`}><i />{keyStatus}</span></div>
        {modelStatus === "missing" && <div className="info-note" style={{ marginTop: 13 }}><strong>Enable model requests</strong>Add MODEL_API_KEY through the project’s secure environment settings. Do not put a key in browser settings, source code or chat. Until configured, uploads remain saved locally and analysis actions show this setup state.</div>}
        {modelStatus === "unavailable" && <div className="inline-error" role="status" style={{ marginTop: 13 }}>Model credential status could not be read. Retry when the application server is available.</div>}
        <div className="setting-row"><div><strong>Muse Spark 1.3</strong><small>Visual observations and before/after comparison</small></div><span className="setting-state"><i />{modelStatus === "present" ? "Provider access unverified" : modelStatus === "missing" ? "Waiting for key" : "Status pending"}</span></div>
        <div className="setting-row"><div><strong>Segment Anything 3.1</strong><small>Prompt-based masks and bounding boxes</small></div><span className="setting-state"><i />{modelStatus === "present" ? "Provider access unverified" : modelStatus === "missing" ? "Waiting for key" : "Status pending"}</span></div>
        {modelStatus === "present" && <div className="info-note" style={{ marginTop: 13, borderColor: "#c6a05a", background: "#f6f0e2", color: "#76633f" }}><strong>Provider billing and access</strong>A stored key confirms only that a credential is present. Meta Model API billing and model entitlement are separate; if the provider returns <code>billing_not_configured</code>, enable billing/access with Meta before retrying. MajiProof does not make payment or account changes.</div>}
      </section>
      <section className="settings-panel">
        <h2><Database size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />Local records</h2>
        <p>Inspection records and evidence photographs are saved in this browser’s IndexedDB. They are not synchronized between devices.</p>
        <div className="setting-row"><div><strong>Browser storage</strong><small>Case metadata, photos and saved results</small></div><span className="setting-state is-ready"><i />On this device</span></div>
        <div className="setting-row"><div><strong>Storage estimate</strong><small>Reported by the browser</small></div><span className="setting-state">{storage}</span></div>
        <div className="info-note" style={{ marginTop: 13 }}><strong><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Share evidence intentionally</strong>Images are sent to Meta only when you run an analysis, segmentation or comparison. Avoid uploading sensitive personal information.</div>
      </section>
      <section className="settings-panel">
        <h2><Smartphone size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />Field capture</h2>
        <p>Photo upload accepts JPEG, PNG and WebP files up to 8 MB and 50 megapixels. The capture control requests the rear camera when the browser supports it.</p>
        <div className="setting-row"><div><strong>Location collection</strong><small>No GPS is required or requested</small></div><span className="setting-state is-ready"><i />Not used</span></div>
        <div className="setting-row"><div><strong>Personal identity</strong><small>No login or personal identity is required</small></div><span className="setting-state is-ready"><i />Not required</span></div>
      </section>
      {process.env.NODE_ENV === "development" && <section className="settings-panel developer-tools-panel">
        <h2><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 7 }} />Developer tools</h2>
        <p>Explicit model evaluation is separate from the field inspection workflow and is available only in a development environment.</p>
        <Link className="btn btn-secondary btn-small" href="/developer/models">Open model evaluation workbench</Link>
      </section>}
    </div>
  </>;
}
