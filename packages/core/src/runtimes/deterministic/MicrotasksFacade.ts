import type { IDeterministicMicrotasks } from "../../types/types.ts";
import type { MicrotaskQueue } from "./MicrotaskQueue.ts";

// A class: a getter in an object literal makes every runtime survive into the old generation.
export class MicrotasksFacade implements IDeterministicMicrotasks {
  readonly #runtime: { assertIsNotDisposed(): void; drain(): void };
  readonly #queue: MicrotaskQueue;
  constructor(runtime: { assertIsNotDisposed(): void; drain(): void }, queue: MicrotaskQueue) {
    this.#runtime = runtime;
    this.#queue = queue;
  }
  queue(callback: () => void): void {
    this.#runtime.assertIsNotDisposed();
    this.#queue.push(callback);
  }
  drain(): void {
    this.#runtime.drain();
  }
  get pendingCount(): number {
    return this.#queue.length;
  }
}
