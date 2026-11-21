import type { IDurationSpec } from "../../deterministic.ts";
import type { IScheduledHandle, ScheduledHandleKind } from "../../types/types.ts";
import type { DueHeap } from "./DueHeap.ts";
import { BaseRuntime } from "../runtime-base.ts";

/** Pending timer entry and {@link IScheduledHandle}. */
export class DueEntry<TDate> implements IScheduledHandle {
  declare runAt: number;
  declare seq: number;
  /** Heap position, or `-1` when detached. */
  declare heapIndex: number;
  /** Used only for intervals; `0` otherwise. */
  declare delay: number;
  /** Used only for recurrences. */
  declare cancelled: boolean;
  declare isDisposed: boolean;
  declare readonly kind: ScheduledHandleKind;
  /** Owning heap. */
  declare readonly owner: DueHeap<TDate>;
  /** Recurrence result; ignored otherwise. */
  declare callback: (() => void) | (() => IDurationSpec | false);
  /** Tag and links used by {@link DueHeap.registerSpecific}. */
  declare tag: unknown;
  declare _tagPrev: DueEntry<TDate> | undefined;
  declare _tagNext: DueEntry<TDate> | undefined;
  #abortController?: AbortController;

  constructor(
    kind: ScheduledHandleKind,
    owner: DueHeap<TDate>,
    runAt: number,
    seq: number,
    delay: number,
    callback: (() => void) | (() => IDurationSpec | false),
  ) {
    this.kind = kind;
    this.owner = owner;
    this.runAt = runAt;
    this.seq = seq;
    this.heapIndex = -1;
    this.delay = delay;
    this.cancelled = false;
    this.callback = callback;
    this.isDisposed = false;
    this.tag = undefined;
    this._tagPrev = undefined;
    this._tagNext = undefined;
  }

  dispose(): void {
    if (this.isDisposed) return;
    // Set before abort(): abort() can synchronously re-enter dispose() through this entry's own
    // "abort" listener below, and that reentrant call must see isDisposed already true and return
    // immediately - otherwise it reaches retireEntry() a second time, and neither the tag unlink
    // nor the dead count is safe to run twice.
    this.isDisposed = true;
    if (this.#abortController !== undefined) {
      this.#abortController.abort("Timer handle is being disposed");
    }
    this.cancelled = true;
    this.owner.retireEntry(this);
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  get signal(): AbortSignal {
    if (this.isDisposed) {
      return BaseRuntime.ABORTED_SIGNAL;
    }
    if (this.#abortController === undefined) {
      this.#abortController = new AbortController();
      this.#abortController.signal.addEventListener("abort", () => {
        this.dispose();
      });
    }
    return this.#abortController.signal;
  }
}
