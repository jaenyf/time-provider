/** Runtime microtask queue and checkpoint. */
export class MicrotaskQueue {
  private readonly _queue: (() => void)[] = [];
  private _draining = false;

  get length(): number {
    return this._queue.length;
  }

  push(callback: () => void): void {
    this._queue.push(callback);
  }

  /** Clears all queued callbacks without running them. */
  clear(): void {
    this._queue.length = 0;
  }

  /**
   * Runs queued callbacks until empty.
   * @param rethrowErrors Whether to rethrow callback errors.
   */
  runCheckpoint(rethrowErrors: boolean): void {
    if (this._draining) return;
    const queue = this._queue;
    let ranCount = 0;
    this._draining = true;
    try {
      if (rethrowErrors) {
        while (ranCount < queue.length) queue[ranCount++]();
      } else {
        while (ranCount < queue.length) {
          try {
            queue[ranCount++]();
          } catch (error) {
            console.error(error);
          }
        }
      }
    } finally {
      // On the common hot path everything queued has run and the whole array goes.
      // Truncating skips the removed-elements array `splice` builds and hands back for nothing.
      if (ranCount === queue.length) {
        queue.length = 0;
      } else {
        queue.splice(0, ranCount);
      }
      this._draining = false;
    }
  }
}
