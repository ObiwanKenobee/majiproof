import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { InspectionStatus } from "@/types/inspection";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return <div className="page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>;
}

const statusLabels: Record<InspectionStatus, string> = {
  draft: "Draft",
  evidence_collection: "Evidence collection",
  analysis_complete: "Analysis complete",
  ready_for_review: "Ready for review",
  approved: "Human approved",
  requires_followup: "Follow-up needed",
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return <span className={`status-badge status-${status}`}><i />{statusLabels[status]}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-state-mark"><span /><span /><span /></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export function SectionLabel({ children, note }: { children: ReactNode; note?: string }) {
  return <div className="section-label-row"><h2 className="section-label">{children}</h2>{note && <span className="section-note">{note}</span>}</div>;
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, options).format(date);
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="arrow-link">{children}<ArrowUpRight size={15} aria-hidden="true" /></a>;
}
