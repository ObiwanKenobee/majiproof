import { PageHeader } from "@/components/ui";
import { ModelWorkbench } from "@/components/developer/model-workbench";

export default function DeveloperModelsPage() {
  return <>
    <PageHeader
      eyebrow="DEVELOPER TOOLING · NOT FIELD NAVIGATION"
      title="Model evaluation workbench"
      description="Compare explicit, schema-validated model runs on the same inspection photo and prompt. No provider is called on page load."
    />
    <ModelWorkbench />
  </>;
}
