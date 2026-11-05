export class InferenceCapacityError extends Error {
  constructor() {
    super("The inference queue is busy. Wait briefly before submitting another request.");
    this.name = "InferenceCapacityError";
  }
}

const MAX_IN_FLIGHT = 3;
const MAX_QUEUED = 6;
let inFlight = 0;
const queue: Array<() => void> = [];

export async function withInferenceCapacity<T>(task: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) {
    if (queue.length >= MAX_QUEUED) throw new InferenceCapacityError();
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  inFlight += 1;
  try {
    return await task();
  } finally {
    inFlight -= 1;
    queue.shift()?.();
  }
}

export function inferenceCapacitySnapshot(): { inFlight: number; queued: number; limit: number } {
  return { inFlight, queued: queue.length, limit: MAX_IN_FLIGHT };
}
