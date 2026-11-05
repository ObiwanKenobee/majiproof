"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, LayoutDashboard, Settings2, Waves } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/inspections", label: "Inspections", Icon: ClipboardCheck },
  { href: "/inspections/new", label: "New inspection", Icon: Waves },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup" aria-label="MajiProof overview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/branding/mark.svg" alt="" />
          <span className="brand-word">MAJI<span>PROOF</span><small>FIELD EVIDENCE SYSTEM</small></span>
        </Link>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : href === "/inspections" ? pathname === href || pathname.startsWith("/inspections/") && pathname !== "/inspections/new" : pathname === href;
            return (
              <Link href={href} key={href} className={`nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                {href === "/inspections/new" && <span className="nav-plus" aria-hidden="true">+</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-indicator"><span className="privacy-dot" />Local-first storage</div>
          <div className="sidebar-note">Evidence stays on this device until sent for model analysis.</div>
          <div className="sidebar-version">MAJIPROOF · FIELD EDITION</div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-context"><span className="topbar-mark" /> Rural water infrastructure <span className="topbar-separator">/</span> Evidence workspace</div>
          <div className="topbar-right"><span className="topbar-status"><i /> Evidence-led inspection</span></div>
        </header>
        <main className="main-content">{children}</main>
        <nav className="mobile-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : href === "/inspections" ? pathname === href || pathname.startsWith("/inspections/") && pathname !== "/inspections/new" : pathname === href;
            return <Link key={href} href={href} className={`mobile-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" /><span>{label === "New inspection" ? "New" : label}</span>
            </Link>;
          })}
        </nav>
      </div>
    </div>
  );
}
