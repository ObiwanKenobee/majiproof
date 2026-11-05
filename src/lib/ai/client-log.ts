import { inferenceLogSchema } from "@/lib/ai/schemas";
import { saveInferenceLog } from "@/lib/storage/indexeddb";

export async function persistInferenceLog(value: unknown): Promise<boolean> {
  const parsed = inferenceLogSchema.safeParse(value);
  if (!parsed.success) return false;
  await saveInferenceLog(parsed.data);
  return true;
}
