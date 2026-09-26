import { type IDurationSpec, toDuration } from "../helpers/branded-types.ts";
import { shouldRethrowTimerErrors } from "../environment.ts";
import { DeterministicTimings } from "../timings/deterministic-timings.ts";
import type {
  IScheduledHandle,
  IAdvanceOptions,
  IDeterministicRuntime,
  IDeterministicMicrotasks,
  IDeterministicScheduler,
  IManualClock,
  IManualRuntime,
  IRuntime,
  ITimeConverter,
  ScheduledHandleKind,
  TimezoneDefinition,
  DurationMilliseconds,
  ITimerOptions,
  EpochMilliseconds,
  ITimings,
  MonotonicMilliseconds,
} from "../types/types.ts";
import {
  SCHEDULED_TIMER_KIND_INTERVAL,
  SCHEDULED_TIMER_KIND_RECURRING,
  SCHEDULED_TIMER_KIND_TIMEOUT,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/** Pending timer entry and {@link IScheduledHandle}. */
class DueEntry<TDate> implements IScheduledHandle {
  runAt: number;
  seq: number;
  /** Heap position, or `-1` when detached. */
  heapIndex: number;
  /** Used only for intervals; `0` otherwise. */
  delay: number;
  /** Used only for recurrences. */
  cancelled: boolean;
  isDisposed: boolean;
  readonly kind: ScheduledHandleKind;
  /** Owning heap. */
  readonly owner: DueHeap<TDate>;
  /** Recurrence result; ignored otherwise. */
  callback: (() => void) | (() => IDurationSpec | false);
  /** Links in the live-entry list. */
  _livePrev: DueEntry<TDate> | undefined;
  _liveNext: DueEntry<TDate> | undefined;
  /** Tag and links used by {@link DueHeap.registerSpecific}. */
  tag: unknown;
  _tagPrev: DueEntry<TDate> | undefined;
  _tagNext: DueEntry<TDate> | undefined;
  readonly #runtime: IRuntime<TDate>;
  #abortController?: AbortController;

  constructor(
    kind: ScheduledHandleKind,
    runtime: IRuntime<TDate>,
    owner: DueHeap<TDate>,
    runAt: number,
    seq: number,
    delay: number,
    callback: (() => void) | (() => IDurationSpec | false),
  ) {
    this.kind = kind;
    this.#runtime = runtime;
    this.owner = owner;
    this.runAt = runAt;
    this.seq = seq;
    this.heapIndex = -1;
    this.delay = delay;
    this.cancelled = false;
    this.callback = callback;
    this.isDisposed = false;
    this._livePrev = undefined;
    this._liveNext = undefined;
    this.tag = undefined;
    this._tagPrev = undefined;
    this._tagNext = undefined;
  }

  dispose(): void {
    if (this.isDisposed) return;
    // Set before abort(): abort() can synchronously re-enter dispose() through this entry's own
    // "abort" listener below, and that reentrant call must see isDisposed already true and return
    // immediately - otherwise it reaches clearTimer()/retireEntry() a second time, and the live
    // list's unlink isn't safe to run twice.
    this.isDisposed = true;
    if (this.#abortController !== undefined) {
      this.#abortController.abort("Timer handle is being disposed");
    }
    this.#runtime.clearTimer(this);
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

/** Runtime microtask queue and checkpoint. */
class MicrotaskQueue {
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

/** Binary min-heap of due entries, ordered by `(runAt, seq)`. */
class DueHeap<TDate> {
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
    runtime: IRuntime<TDate>,
    runAt: number,
    delay: number,
    callback: (() => void) | (() => IDurationSpec | false),
  ): DueEntry<TDate> {
    const entry = new DueEntry(kind, runtime, this, runAt, this._nextSeq++, delay, callback);
    this._insert(entry);
    this._linkLive(entry);
    if (tag !== undefined) {
      entry.tag = tag;
      this._linkTag(entry, tag);
    }
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

  registerTimeout(runtime: IRuntime<TDate>, runAt: number, callback: () => void): DueEntry<TDate> {
    return this.registerSpecific(
      undefined,
      SCHEDULED_TIMER_KIND_TIMEOUT,
      runtime,
      runAt,
      0,
      callback,
    );
  }

  registerInterval(
    runtime: IRuntime<TDate>,
    runAt: number,
    delay: number,
    callback: () => void,
  ): DueEntry<TDate> {
    return this.registerSpecific(
      undefined,
      SCHEDULED_TIMER_KIND_INTERVAL,
      runtime,
      runAt,
      delay,
      callback,
    );
  }

  registerRecurring(
    runtime: IRuntime<TDate>,
    runAt: number,
    callback: () => IDurationSpec | false,
  ): DueEntry<TDate> {
    return this.registerSpecific(
      undefined,
      SCHEDULED_TIMER_KIND_RECURRING,
      runtime,
      runAt,
      0,
      callback,
    );
  }

  /** Retires an entry from the live/tag lists and lazily from the heap. */
  retireEntry(entry: DueEntry<TDate>): void {
    this._unlinkLive(entry);
    if (entry.tag !== undefined) this._unlinkTag(entry);
    if (entry.heapIndex < 0) return;
    this._deadCount++;
    if (this._deadCount > this._entries.length * DueHeap.COMPACTION_THRESHOLD) this._compact();
  }

  /** Disposes all entries and clears the heap and live list. */
  disposeAll(): void {
    for (const entry of this._entries) {
      entry.heapIndex = -1;
    }
    this._entries = [];
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

  /** Runs callbacks due at or before `now` and checkpoints microtasks after each one. */
  drainDue(now: number, microtasks: MicrotaskQueue): void {
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
            root.runAt += root.delay > 0 ? root.delay : 1;
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
            const previousRunAt = root.runAt;
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

/** Base class for deterministic runtimes. */
export abstract class BaseDeterministicRuntime<TDate>
  extends BaseRuntime<TDate>
  implements IDeterministicRuntime<TDate>
{
  #dueQueue: DueHeap<TDate>;
  #dueDrainingDisabled = false;
  #microtasks: MicrotaskQueue;
  #rethrowTimerErrors: boolean;
  #timings = new DeterministicTimings(this);
  #monotonicOrigin!: EpochMilliseconds;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter);
    this.#dueQueue = new DueHeap<TDate>();
    this.#microtasks = new MicrotaskQueue();
    this.#rethrowTimerErrors = shouldRethrowTimerErrors();
  }

  /** Initializes {@link monotonicOrigin} from the current clock time. */
  protected startMonotonicClock(): void {
    this.#monotonicOrigin = this.timestampNow();
  }

  get timings(): ITimings {
    return this.#timings;
  }

  monotonicNow(): MonotonicMilliseconds {
    return (this.timestampNow() - this.#monotonicOrigin) as MonotonicMilliseconds;
  }

  get monotonicOrigin(): EpochMilliseconds {
    return this.#monotonicOrigin;
  }

  /** Produces the local date for a clock read. */
  protected abstract localNowImpl(): TDate;

  /** Produces the UTC date for a clock read. */
  protected abstract utcNowImpl(): TDate;

  /** Produces the timestamp for {@link timestampNow}. */
  protected abstract timestampNowImpl(): EpochMilliseconds;

  timestampNow(): EpochMilliseconds {
    return this.timestampNowImpl();
  }

  localNow(): TDate {
    return this.localNowImpl();
  }

  utcNow(): TDate {
    return this.utcNowImpl();
  }

  //#region heap management
  /** Permanently disables {@link mayRunDueCallbacks}. */
  protected disableDueDraining(): void {
    this.#dueDrainingDisabled = true;
  }

  /** Returns this runtime as a deterministic scheduler. */
  override get scheduler(): IDeterministicScheduler {
    return this;
  }

  //#region microtasks management
  /** Returns this runtime as deterministic microtasks. */
  override get microtasks(): IDeterministicMicrotasks {
    return this;
  }

  /** Queues `callback` on this runtime's microtask queue. */
  queue(callback: () => void): void {
    this.assertIsNotDisposed();
    this.#microtasks.push(callback);
  }

  /** Runs this runtime's pending microtasks. */
  drain(): void {
    this.#microtasks.runCheckpoint(this.#rethrowTimerErrors);
  }
  //#endregion microtasks management

  protected mayRunDueCallbacks(nowTimestamp: number): void {
    const microtasks = this.#microtasks;
    /* the call that got us here ends a task, so its microtasks are owed before any timer runs */
    if (microtasks.length !== 0) microtasks.runCheckpoint(this.#rethrowTimerErrors);
    if (this.#dueDrainingDisabled) return;
    this.#dueQueue.drainDue(nowTimestamp, microtasks);
  }

  /** Drains due entries while advancing the clock. */
  protected drainDueAdvancing(
    targetTimestamp: number,
    setCurrentTimestamp: (runAt: number) => void,
  ): void {
    const microtasks = this.#microtasks;
    /* advance() ends a task like any other call that may run due callbacks - see
       mayRunDueCallbacks - so its microtasks are owed up front, even if this walk finds nothing
       due at all. */
    if (microtasks.length !== 0) microtasks.runCheckpoint(this.#rethrowTimerErrors);
    this.#dueQueue.drainDueAdvancing(targetTimestamp, setCurrentTimestamp, microtasks);
  }

  /** Disposes timers and queued microtasks. */
  protected override disposeTimersHandles(): void {
    this.#dueQueue.disposeAll();
    this.#microtasks.clear();
  }
  //#endregion heap management

  //#region timers
  clearTimer(handle: IScheduledHandle): void {
    // Only this class's own once()/every()/recurring() ever construct a handle for this runtime,
    // and they always hand back the DueEntry itself - safe to assume that shape here.
    const entry = handle as DueEntry<TDate>;
    if (entry.owner === this.#dueQueue) {
      entry.cancelled = true;
      this.#dueQueue.retireEntry(entry);
    }
  }

  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    let msDelay = toDuration(delay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerTimeout(this, now + msDelay, callback);
    this.mayRunDueCallbacks(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    let msDelay = toDuration(delay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerInterval(this, now + msDelay, msDelay, callback);
    this.mayRunDueCallbacks(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }

  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): IScheduledHandle {
    this.assertIsNotDisposed();
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerRecurring(this, now + msInitialDelay, callback);
    this.mayRunDueCallbacks(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }

  specific(
    tag: unknown,
    kind: ScheduledHandleKind,
    initialDelay: IDurationSpec,
    callback: () => void,
    intervalDelay?: number,
  ): IScheduledHandle {
    this.assertIsNotDisposed();
    let msDelay = toDuration(initialDelay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerSpecific(
      tag,
      kind,
      this,
      now + msDelay,
      intervalDelay ?? 0,
      callback,
    );
    this.mayRunDueCallbacks(now);
    return entry;
  }

  takeOutSpecificCallbacks(tag: unknown, maxCount: number): (() => void)[] {
    return this.#dueQueue.takeOutCallbacksByTag(tag, maxCount);
  }
  //#endregion tagged timers
}

/** Base class for deterministic sequential runtimes. */
export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  /** Epoch timestamps consumed one per clock read; the last repeats. */
  protected _sequentialTimestamps: number[];
  #sequentialIndex = 0;

  /**
   * @param localTimezone The runtime timezone.
   * @param sequentialTimes Timestamps consumed one per clock read.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, converter);
    this._sequentialTimestamps = sequentialTimes.map((t) => this.convertToEpochTimestampImpl(t));
    this.startMonotonicClock();
  }

  localNowImpl(): TDate {
    const nowTimestamp = this.consumeNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    // Already a validated epoch-milliseconds value (see timestampNowImpl below) - no need to
    // round-trip it back through toInstant()'s spec-object validation.
    return this.convertToLocalDateImpl(this.localTimezone, nowTimestamp as EpochMilliseconds);
  }

  utcNowImpl(): TDate {
    const nowTimestamp = this.consumeNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    return this.convertToUtcDateImpl(nowTimestamp as EpochMilliseconds);
  }

  /** Returns the current sequence value without consuming it or running callbacks. */
  timestampNowImpl(): EpochMilliseconds {
    // _sequentialTimestamps entries are already validated epoch-milliseconds values (populated via
    // convertToEpochTimestampImpl, which itself validates) - no need to re-validate them here by
    // round-tripping through toInstant()'s spec-object form.
    return (
      this._sequentialTimestamps.length > 0 ? this._sequentialTimestamps[this.#sequentialIndex] : 0
    ) as EpochMilliseconds;
  }

  private consumeNextSequentialTimestamp(): number {
    if (this.#sequentialIndex < this._sequentialTimestamps.length - 1) {
      return this._sequentialTimestamps[this.#sequentialIndex++];
    }
    return this._sequentialTimestamps[this.#sequentialIndex] ?? 0;
  }
}

/** Base class for deterministic fixed runtimes. */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  /**
   * @param localTimezone The runtime timezone.
   * @param fixedTime The fixed clock time.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
    // Time never advances on a fixed clock, so scheduled callbacks are never due - see ITimers.
    // Microtasks aren't time-driven, so they still run - see mayRunDueCallbacks's own checkpoint.
    this.disableDueDraining();
  }
}

/** Base class for deterministic manual runtimes. */
export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  /**
   * @param localTimezone The runtime timezone.
   * @param fixedTime The initial clock time.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  /** Sets the current clock time to `time`. */
  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToEpochTimestampImpl(time);
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

  /** Advances the clock by the given fields in {@link IAdvanceOptions} order. */
  advance(advanceConfiguration: IAdvanceOptions): IManualRuntime<TDate> {
    this.assertIsNotDisposed();
    // Pure read: getting a TDate to feed the calendar-arithmetic helpers below must not itself
    // drain the due queue (this.utcNow() would, uselessly, since nothing is newly due yet).
    let time = this.convertToUtcDateImpl(this.timestampNow());

    if (advanceConfiguration.years) {
      time = this.advanceYears(time, advanceConfiguration.years);
    }
    if (advanceConfiguration.months) {
      time = this.advanceMonths(time, advanceConfiguration.months);
    }
    if (advanceConfiguration.days) {
      time = this.advanceDays(time, advanceConfiguration.days);
    }
    if (advanceConfiguration.hours) {
      time = this.advanceHours(time, advanceConfiguration.hours);
    }
    if (advanceConfiguration.minutes) {
      time = this.advanceMinutes(time, advanceConfiguration.minutes);
    }
    if (advanceConfiguration.seconds) {
      time = this.advanceSeconds(time, advanceConfiguration.seconds);
    }
    if (advanceConfiguration.milliseconds) {
      time = this.advanceMilliseconds(time, advanceConfiguration.milliseconds);
    }

    const targetTimestamp = this.convertToEpochTimestampImpl(time);

    // Walk due entries one at a time rather than jumping straight to targetTimestamp first: a
    // callback that reschedules itself (e.g. a requestAnimationFrame-style self-rescheduling
    // setTimeout) reads timestampNow() when it re-registers, so it must see the clock at *its
    // own* due time, not already at the final target - otherwise its new entry always lands
    // past the target and the whole chain fires only once per advance(), however large the gap.
    this.drainDueAdvancing(targetTimestamp, (runAt) => {
      this._sequentialTimestamps[0] = runAt;
    });

    this.setDeterminedTime(time);
    return this;
  }

  /** Returns `time` shifted by `years`. */
  protected abstract advanceYears(time: TDate, years: number): TDate;
  /** Returns `time` shifted by `months`. */
  protected abstract advanceMonths(time: TDate, months: number): TDate;
  /** Returns `time` shifted by `days`. */
  protected abstract advanceDays(time: TDate, days: number): TDate;
  /** Returns `time` shifted by `hours`. */
  protected abstract advanceHours(time: TDate, hours: number): TDate;
  /** Returns `time` shifted by `minutes`. */
  protected abstract advanceMinutes(time: TDate, minutes: number): TDate;
  /** Returns `time` shifted by `seconds`. */
  protected abstract advanceSeconds(time: TDate, seconds: number): TDate;
  /** Returns `time` shifted by `milliseconds`. */
  protected abstract advanceMilliseconds(time: TDate, milliseconds: number): TDate;
}
