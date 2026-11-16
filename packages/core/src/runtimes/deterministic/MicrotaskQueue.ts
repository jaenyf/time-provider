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

  private removeExecutedCallbacks(queue: (() => void)[], ranCount: number): void {
    if (ranCount === queue.length) {
      queue.length = 0;
    } else {
      queue.splice(0, ranCount);
    }
  }

  private runCallbacks(queue: (() => void)[], rethrowErrors: boolean): void {
    let ranCount = 0;

    try {
      if (rethrowErrors) {
        while (ranCount < queue.length) {
          queue[ranCount++]();
        }
        return;
      }
      while (ranCount < queue.length) {
        try {
          queue[ranCount++]();
        } catch (error) {
          console.error(error);
        }
      }
    } finally {
      this.removeExecutedCallbacks(queue, ranCount);
    }
  }

  /**
   * Runs queued callbacks until empty.
   * @param rethrowErrors Whether to rethrow callback errors.
   */
  runCheckpoint(rethrowErrors: boolean): void {
    if (this._draining) return;

    const queue = this._queue;
    this._draining = true;

    try {
      this.runCallbacks(queue, rethrowErrors);
    } finally {
      this._draining = false;
    }
  }
}
