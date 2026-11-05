import { describe, expect, it } from "vitest";
import { inferenceCapacitySnapshot, withInferenceCapacity } from "@/lib/ai/concurrency";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
async function tick() { await new Promise<void>((resolve) => setTimeout(resolve, 0)); }

describe("process-local inference capacity", () => {
  it("caps concurrent provider work, queues a bounded request and releases capacity", async () => {
    const holds = Array.from({ length: 4 }, () => deferred());
    const calls = holds.map((hold) => withInferenceCapacity(() => hold.promise));
    await tick();
    expect(inferenceCapacitySnapshot()).toMatchObject({ inFlight: 3, queued: 1, limit: 3 });
    holds[0].resolve();
    await tick();
    expect(inferenceCapacitySnapshot()).toMatchObject({ inFlight: 3, queued: 0, limit: 3 });
    holds.slice(1).forEach((hold) => hold.resolve());
    await Promise.all(calls);
    expect(inferenceCapacitySnapshot()).toMatchObject({ inFlight: 0, queued: 0, limit: 3 });
  });
});
