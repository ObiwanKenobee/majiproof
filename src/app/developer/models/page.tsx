import { PageHeader } from "@/components/ui";
import { ModelWorkbench } from "@/components/developer/model-workbench";

export default function DeveloperModelsPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  return <>
    <PageHeader
      eyebrow="DEVELOPER TOOLING · NOT FIELD NAVIGATION"
      title="Model evaluation workbench"
      description="Compare explicit, schema-validated model runs on the same inspection photo and prompt. No provider is called on page load."
    />
    {isDevelopment ? <ModelWorkbench /> : <div className="panel empty-state"><h2>Developer workbench unavailable</h2><p>Model evaluation is restricted to a development environment. Production field users cannot select experimental providers.</p></div>}
  </>;
}
