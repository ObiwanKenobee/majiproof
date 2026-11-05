import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MajiProof — Evidence-led water infrastructure inspection",
  description: "Visual inspection records and before-and-after evidence for rural water infrastructure.",
  icons: { icon: "/branding/mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
