"use client";

import { useParams } from "next/navigation";
import { InspectionWorkspace } from "@/components/inspection-workspace";

export default function InspectionPage() {
  const params = useParams<{ id: string }>();
  return <InspectionWorkspace inspectionId={params.id} />;
}
