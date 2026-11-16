import type { MicrotaskQueue } from "./MicrotaskQueue.ts";

// A class: a getter in an object literal makes every runtime survive into the old generation.
export class MicrotasksFacade {
  readonly #queue: MicrotaskQueue;
  constructor(queue: MicrotaskQueue) {
    this.#queue = queue;
  }
  get pendingCount(): number {
    return this.#queue.length;
  }
}
