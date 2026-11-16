import { type IDurationSpec, toDuration } from "../../deterministic.ts";
import { shouldRethrowTimerErrors } from "../../environment.ts";
import {
  type ScheduledHandleKind,
  SCHEDULED_TIMER_KIND_TIMEOUT,
  SCHEDULED_TIMER_KIND_INTERVAL,
  SCHEDULED_TIMER_KIND_RECURRING,
} from "../../types/types.ts";
import { DueEntry } from "./DueEntry.ts";
import { MicrotaskQueue } from "./MicrotaskQueue.ts";

/** Binary min-heap of due entries, ordered by `(runAt, seq)`. */

export class DueHeap<TDate> {
  /** Compact when tombstones exceed this fraction of `_entries`. */
  private static readonly COMPACTION_THRESHOLD = 0.5;
  private _entries: DueEntry<TDate>[] = [];
  private _nextSeq = 1;
  private _shouldRethrowTimerErrors: boolean;
  /** Intrusive list of all undisposed entries. */
  private _liveHead: DueEntry<TDate> | undefined;
  private _liveTail: DueEntry<TDate> | undefined;
  /** Intrusive lists keyed by tag. */
  private _tagLists = new Map<unknown, { head: DueEntry<TDate>; tail: DueEntry<TDate> }>();
  /** Number of tombstoned entries in `_entries`. */
  private _deadCount = 0;
  /** Number of live untagged entries in `_entries`. */
  private _untaggedCount = 0;
  constructor() {
    this._shouldRethrowTimerErrors = shouldRethrowTimerErrors();
  }

  /** The earliest pending `runAt`, or `undefined` if empty. */
  peekRunAt(): number | undefined {
    return this._entries.length > 0 ? this._entries[0].runAt : undefined;
  }

  private _linkLive(entry: DueEntry<TDate>): void {
    entry._livePrev = this._liveTail;
    if (this._liveTail !== undefined) {
      this._liveTail._liveNext = entry;
    } else {
      this._liveHead = entry;
    }
    this._liveTail = entry;
  }

  private _unlinkLive(entry: DueEntry<TDate>): void {
    if (entry._livePrev !== undefined) {
      entry._livePrev._liveNext = entry._liveNext;
    } else {
      this._liveHead = entry._liveNext;
    }
    if (entry._liveNext !== undefined) {
      entry._liveNext._livePrev = entry._livePrev;
    } else {
      this._liveTail = entry._livePrev;
    }
    entry._livePrev = undefined;
    entry._liveNext = undefined;
  }

  private _linkTag(entry: DueEntry<TDate>, tag: unknown): void {
    const list = this._tagLists.get(tag);
    if (list === undefined) {
      this._tagLists.set(tag, { head: entry, tail: entry });
      return;
    }
    entry._tagPrev = list.tail;
    list.tail._tagNext = entry;
    list.tail = entry;
  }

  private _unlinkTag(entry: DueEntry<TDate>): void {
    // Always set by _linkTag right when this entry was created (registerSpecific is the only
    // caller that ever sets entry.tag), and never removed until this same unlink runs - so by
    // construction, the list for this entry's tag is always present here.
    const list = this._tagLists.get(entry.tag)!;
    if (entry._tagPrev !== undefined) {
      entry._tagPrev._tagNext = entry._tagNext;
    }
    if (entry._tagNext !== undefined) {
      entry._tagNext._tagPrev = entry._tagPrev;
    }
    if (list.head === entry && list.tail === entry) {
      this._tagLists.delete(entry.tag);
    } else {
      if (list.head === entry) list.head = entry._tagNext!;
      if (list.tail === entry) list.tail = entry._tagPrev!;
    }
    entry._tagPrev = undefined;
    entry._tagNext = undefined;
  }

  /** Creates and registers a timer entry, optionally under `tag`. */
  registerSpecific(
    tag: unknown,
    kind: ScheduledHandleKind,
    runAt: number,
    delay: number,
    callback: (() => void) | (() => IDurationSpec | false),
  ): DueEntry<TDate> {
    const entry = new DueEntry(kind, this, runAt, this._nextSeq++, delay, callback);
    if (tag !== undefined) {
      entry.tag = tag;
      this._linkTag(entry, tag);
    }
    this._insert(entry);
    this._linkLive(entry);
    return entry;
  }

  /** Extracts and removes up to `maxCount` callbacks registered under `tag`. */
  takeOutCallbacksByTag(tag: unknown, maxCount: number): (() => void)[] {
    const callbacks: (() => void)[] = [];
    let node = this._tagLists.get(tag)?.head;
    while (node !== undefined && callbacks.length < maxCount) {
      const next = node._tagNext;
      callbacks.push(node.callback as () => void);
      node.dispose();
      node = next;
    }
    return callbacks;
  }

  /** Removes tombstones and rebuilds the heap. */
  private _compact(): void {
    const survivors = this._entries.filter((entry) => !entry.isDisposed);
    for (let i = 0; i < survivors.length; i++) survivors[i].heapIndex = i;
    this._entries = survivors;
    for (let i = (survivors.length >> 1) - 1; i >= 0; i--) {
      this._siftDown(survivors[i], i);
    }
    this._deadCount = 0;
  }

  registerTimeout(runAt: number, callback: () => void): DueEntry<TDate> {
    return this.registerSpecific(undefined, SCHEDULED_TIMER_KIND_TIMEOUT, runAt, 0, callback);
  }

  registerInterval(runAt: number, delay: number, callback: () => void): DueEntry<TDate> {
    return this.registerSpecific(undefined, SCHEDULED_TIMER_KIND_INTERVAL, runAt, delay, callback);
  }

  registerRecurring(runAt: number, callback: () => IDurationSpec | false): DueEntry<TDate> {
    return this.registerSpecific(undefined, SCHEDULED_TIMER_KIND_RECURRING, runAt, 0, callback);
  }

  /** Number of pending untagged entries. */
  get untaggedCount(): number {
    return this._untaggedCount;
  }

  /** Earliest `runAt` of a pending untagged entry in the subtree at `index`, or `Infinity`. */
  firstUntaggedRunAt(index = 0): number {
    if (this._untaggedCount === 0) return Infinity;

    const entry = this._entries[index];
    if (entry === undefined) return Infinity;
    if (entry.tag === undefined && !entry.isDisposed) return entry.runAt;
    return Math.min(this.firstUntaggedRunAt(index * 2 + 1), this.firstUntaggedRunAt(index * 2 + 2));
  }

  /** Latest `runAt` of a pending untagged entry. */
  lastUntaggedRunAt(): number | undefined {
    let runAt: number | undefined;
    for (const entry of this._entries) {
      if (
        entry.tag === undefined &&
        !entry.isDisposed &&
        (runAt === undefined || entry.runAt > runAt)
      ) {
        runAt = entry.runAt;
      }
    }
    return runAt;
  }

  /** Number of pending untagged entries due at or before `runAt` in the subtree at `index`. */
  countUntaggedDueBy(runAt: number, index = 0): number {
    const entry = this._entries[index];
    if (entry === undefined || entry.runAt > runAt) return 0;
    return (
      (entry.tag === undefined && !entry.isDisposed ? 1 : 0) +
      this.countUntaggedDueBy(runAt, index * 2 + 1) +
      this.countUntaggedDueBy(runAt, index * 2 + 2)
    );
  }

  /** Number of live entries under `tag`. */
  countTagged(tag: unknown): number {
    let count = 0;
    for (let entry = this._tagLists.get(tag)?.head; entry !== undefined; entry = entry._tagNext) {
      count++;
    }
    return count;
  }

  /** Retires an entry from the live/tag lists and lazily from the heap. */
  retireEntry(entry: DueEntry<TDate>): void {
    this._unlinkLive(entry);
    if (entry.tag !== undefined) this._unlinkTag(entry);
    if (entry.heapIndex < 0) return;
    if (entry.tag === undefined) this._untaggedCount--;
    this._deadCount++;
    if (this._deadCount > this._entries.length * DueHeap.COMPACTION_THRESHOLD) this._compact();
  }

  /** Disposes all entries and clears the heap and live list. */
  disposeAll(): void {
    for (const entry of this._entries) {
      entry.heapIndex = -1;
    }
    this._entries = [];
    this._untaggedCount = 0;
    let entry = this._liveHead;
    this._liveHead = undefined;
    this._liveTail = undefined;
    while (entry !== undefined) {
      const next = entry._liveNext;
      entry._livePrev = undefined;
      entry._liveNext = undefined;
      entry.dispose();
      entry = next;
    }
  }

  /** Appends `entry` and sifts it up. */
  private _insert(entry: DueEntry<TDate>): void {
    const index = this._entries.length;
    if (entry.tag === undefined) this._untaggedCount++;
    this._entries.push(entry);
    this._siftUp(entry, index);
  }

  /** Sifts `moving` up using the hole algorithm. */
  private _siftUp(moving: DueEntry<TDate>, index: number): void {
    const entries = this._entries;
    const movingRunAt = moving.runAt;
    const movingSeq = moving.seq;
    while (index > 0) {
      const parentIndex = (index - 1) >>> 1;
      const parent = entries[parentIndex];
      const parentRunAt = parent.runAt;
      const parentSeq = parent.seq;
      //#region inlining of isBefore
      if (movingRunAt > parentRunAt || (movingRunAt === parentRunAt && movingSeq >= parentSeq)) {
        break;
      }
      //#endregion inlining of isBefore
      entries[index] = parent;
      parent.heapIndex = index;
      index = parentIndex;
    }
    entries[index] = moving;
    moving.heapIndex = index;
  }

  /** Sifts `moving` down using the hole algorithm. */
  private _siftDown(moving: DueEntry<TDate>, index: number): void {
    const entries = this._entries;
    const length = entries.length;
    const movingRunAt = moving.runAt;
    const movingSeq = moving.seq;
    for (;;) {
      const left = index * 2 + 1;
      if (left >= length) break;
      const right = left + 1;
      let smallestIndex = left;
      let smallest = entries[left];
      let smallestRunAt = smallest.runAt;
      let smallestSeq = smallest.seq;
      if (right < length) {
        const rightEntry = entries[right];
        const rightRunAt = rightEntry.runAt;
        const rightSeq = rightEntry.seq;
        //#region inlining of isBefore
        if (
          rightRunAt < smallestRunAt ||
          (rightRunAt === smallestRunAt && rightSeq < smallestSeq)
        ) {
          smallestIndex = right;
          smallest = rightEntry;
          smallestRunAt = rightRunAt;
          smallestSeq = rightSeq;
        }
        //#endregion inlining of isBefore
      }
      //#region inlining of isBefore
      if (
        movingRunAt < smallestRunAt ||
        (movingRunAt === smallestRunAt && movingSeq <= smallestSeq)
      ) {
        break;
      }
      //#endregion inlining of isBefore
      entries[index] = smallest;
      smallest.heapIndex = index;
      index = smallestIndex;
    }
    entries[index] = moving;
    moving.heapIndex = index;
  }

  /**
   * Runs callbacks due at or before `now` and checkpoints microtasks after each one.
   * @param coalesce Re-arms overdue intervals and recurrences from `now`, so each fires once.
   */
  drainDue(now: number, microtasks: MicrotaskQueue, coalesce = false): void {
    const entries = this._entries;
    const rethrowTimersErrors = this._shouldRethrowTimerErrors;

    try {
      for (;;) {
        //#region inlining of DueHeap.peek
        if (entries.length === 0) break;
        const root = entries[0];
        //#endregion inlining of DueHeap.peek
        if (root.runAt > now) break;

        switch (root.kind) {
          case SCHEDULED_TIMER_KIND_TIMEOUT: {
            //this loop's root-removal is duplicated rather than shared with the TIMER_KIND_RECURRING
            //#region inlining of DueHeap.pop
            root.heapIndex = -1;
            const lastIndex = entries.length - 1;
            if (lastIndex > 0) {
              const last = entries.pop()!;
              this._siftDown(last, 0);
            } else {
              entries.pop();
            }
            //#endregion inlining of DueHeap.pop
            // Tombstoned by takeOutCallbacksByTag() before naturally becoming due (see that
            // method) - already logically gone, so this pop is the only thing left to do for it.
            // Always false for a plain once() entry, since those are only ever cancelled eagerly.
            if (root.isDisposed) {
              this._deadCount--;
              continue;
            }
            if (root.tag === undefined) this._untaggedCount--;
            if (rethrowTimersErrors) {
              root.callback();
            } else {
              try {
                root.callback();
              } catch (error) {
                console.error(error);
              }
            }
            // A one-shot timer has nothing left to dispose once its callback has run.
            root.dispose();

            break;
          }
          case SCHEDULED_TIMER_KIND_INTERVAL: {
            if (root.isDisposed) {
              // Lazily disposed before this tick (see retireEntry) - pop it out for good rather
              // than rescheduling a zombie interval that would just keep coming back due.
              root.heapIndex = -1;
              const lastIndex = entries.length - 1;
              if (lastIndex > 0) {
                const last = entries.pop()!;
                this._siftDown(last, 0);
              } else {
                entries.pop();
              }
              this._deadCount--;
              continue;
            }
            const callback = root.callback;
            //#region inlining of DueHeap.nextSeq
            root.seq = this._nextSeq++;
            //#endregion inlining of DueHeap.nextSeq
            root.runAt =
              (coalesce && root.runAt < now ? now : root.runAt) + (root.delay > 0 ? root.delay : 1);
            //#region inlining of DueHeap.fixAfterIncrease
            this._siftDown(root, 0);
            //#endregion inlining of DueHeap.fixAfterIncrease
            if (rethrowTimersErrors) {
              callback();
            } else {
              try {
                callback();
              } catch (error) {
                console.error(error);
              }
            }
            break;
          }
          case SCHEDULED_TIMER_KIND_RECURRING: {
            //#region inlining of DueHeap.pop
            root.heapIndex = -1;
            const lastIndex = entries.length - 1;
            if (lastIndex > 0) {
              const last = entries.pop()!;
              this._siftDown(last, 0);
            } else {
              entries.pop();
            }
            //#endregion inlining of DueHeap.pop
            if (root.isDisposed) {
              // Lazily disposed before this tick (see retireEntry) - already logically gone.
              this._deadCount--;
              continue;
            }
            this._untaggedCount--;
            const previousRunAt = coalesce && root.runAt < now ? now : root.runAt;
            // root.kind === SCHEDULED_TIMER_KIND_RECURRING here guarantees callback has this shape.
            const recurringCallback = root.callback as () => IDurationSpec | false;
            let next: IDurationSpec | false;

            if (rethrowTimersErrors) {
              next = recurringCallback();
            } else {
              try {
                next = recurringCallback();
              } catch (error) {
                console.error(error);
                next = false;
              }
            }

            if (!root.cancelled && next !== false) {
              //#region inlining of DueHeap.nextSeq
              root.seq = this._nextSeq++;
              //#endregion inlining of DueHeap.nextSeq
              let nextMs = toDuration(next);
              root.runAt = previousRunAt + (nextMs < 1 ? 1 : nextMs);
              this._insert(root);
            } else if (!root.cancelled) {
              // Exhausted naturally (returned false): nothing left to dispose. A concurrent
              // dispose() during the callback already did this itself (root.cancelled would be true).
              root.dispose();
            }
            break;
          }
        }

        /* the due callback just ran is a task, and every task ends on a microtask checkpoint */
        if (microtasks.length !== 0) microtasks.runCheckpoint(rethrowTimersErrors);
      }
    } finally {
      /* a due callback that threw still leaves the checkpoint owed, as it would natively */
      if (microtasks.length !== 0) microtasks.runCheckpoint(rethrowTimersErrors);
    }
  }

  /** Drains due entries up to `targetTimestamp`, updating the clock to each due time. */
  drainDueAdvancing(
    targetTimestamp: number,
    setCurrentTimestamp: (runAt: number) => void,
    microtasks: MicrotaskQueue,
  ): void {
    for (;;) {
      const nextDue = this.peekRunAt();
      if (nextDue === undefined || nextDue > targetTimestamp) break;
      setCurrentTimestamp(nextDue);
      this.drainDue(nextDue, microtasks);
    }
  }
}
