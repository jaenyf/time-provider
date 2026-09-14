import { type IDurationSpec, toDuration } from "../helpers/branded-types.ts";
import { shouldRethrowTimerErrors } from "../environment.ts";
import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  IScheduledHandle,
  IAdvanceOptions,
  IDeterministicRuntime,
  IDeterministicTimers,
  IManualClock,
  IManualRuntime,
  IRuntime,
  ITimeConverter,
  ScheduledHandleKind,
  TimezoneDefinition,
  DurationMilliseconds,
  ITimerOptions,
  EpochMilliseconds,
} from "../types/types.ts";
import {
  SCHEDULED_TIMER_KIND_INTERVAL,
  SCHEDULED_TIMER_KIND_RECURRING,
  SCHEDULED_TIMER_KIND_TIMEOUT,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/**
 * A pending timer entry in a {@link DueHeap} - also the {@link IScheduledHandle} handed back to
 * callers, so scheduling a timer only ever allocates this one object (a separate heap entry plus
 * a wrapping handle would be two). One class for all three timer kinds rather than a kind-specific
 * subclass each: measured markedly faster here, since a single shared shape keeps the heap's
 * `_siftUp`/`_siftDown`/`drainDue` monomorphic across kinds instead of polymorphic.
 */
class DueEntry<TDate> implements IScheduledHandle {
  runAt: number;
  seq: number;
  /**
   * Current position of this entry in the owning heap's backing array, or -1 when the entry
   * isn't currently stored in the heap (fired or cancelled).
   */
  heapIndex: number;
  /** Meaningful only for TIMER_KIND_INTERVAL; 0 on the other kinds. */
  delay: number;
  /** Meaningful only for TIMER_KIND_RECURRING; unused on the other kinds. */
  cancelled: boolean;
  isDisposed: boolean;
  readonly kind: ScheduledHandleKind;
  /**
   * The heap instance owning this entry. Guards against a handle from one runtime being used to
   * clear an entry in a different runtime's heap.
   */
  readonly owner: DueHeap<TDate>;
  /** Return value decides the next run for TIMER_KIND_RECURRING; ignored on the other kinds. */
  callback: (() => void) | (() => IDurationSpec | false);
  /**
   * Links in the heap's intrusive "every entry ever created, until individually disposed" list -
   * separate from the heap's own array (a fired or cancelled entry leaves that array, but must
   * stay reachable here so the runtime's own dispose() can still mark it disposed later). A plain
   * `Set` measured roughly twice as slow here at this call volume.
   */
  _livePrev: DueEntry<TDate> | undefined;
  _liveNext: DueEntry<TDate> | undefined;
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

/**
 * A runtime's microtask queue, and the checkpoint that drains it.
 *
 * The checkpoint is deliberately not reentrant: nothing in the host runs a nested checkpoint
 * either. A callback can trigger a further checkpoint indirectly - scheduling a timer or reading
 * a sequential/manual clock both go through {@link BaseDeterministicRuntime.mayRunDueCallbacks} -
 * and without the guard below, that reentrant call would restart the drain loop at index 0 on the
 * same backing array and rerun every callback that already ran this checkpoint, including itself.
 * A `queueMicrotask` call made while already draining is simply appended: the active loop reads
 * `queue.length` fresh on every iteration, so it picks the new entry up on its own, exactly as a
 * microtask queueing another microtask does natively.
 */
class MicrotaskQueue {
  private readonly _queue: (() => void)[] = [];
  private _draining = false;

  get length(): number {
    return this._queue.length;
  }

  push(callback: () => void): void {
    this._queue.push(callback);
  }

  /**
   * Runs every queued callback in order, until the queue is empty - a microtask queueing another
   * microtask is picked up by the same checkpoint, exactly as the host does. A callback that
   * throws is handled per {@link shouldRethrowTimerErrors}; either way the callbacks that already
   * ran are removed, so a throwing one never runs a second time on a later checkpoint.
   *
   * A no-op while a checkpoint on this queue is already running; see the class doc.
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
  private _entries: DueEntry<TDate>[] = [];
  private _nextSeq = 1;
  private _shouldRethrowTimerErrors: boolean;
  /**
   * Intrusive doubly-linked list of every entry this heap has ever created, until it's
   * individually disposed - a fired or cancelled entry leaves `_entries` (the binary heap array)
   * but stays linked here, since {@link disposeAll} must still be able to reach and dispose it.
   */
  private _liveHead: DueEntry<TDate> | undefined;
  private _liveTail: DueEntry<TDate> | undefined;
  constructor() {
    this._shouldRethrowTimerErrors = shouldRethrowTimerErrors();
  }

  /** The `runAt` of the earliest pending entry, or `undefined` if the queue is empty. */
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

  registerTimeout(runtime: IRuntime<TDate>, runAt: number, callback: () => void): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_TIMEOUT,
      runtime,
      this,
      runAt,
      this._nextSeq++,
      0,
      callback,
    );
    this._insert(entry);
    this._linkLive(entry);
    return entry;
  }

  registerInterval(
    runtime: IRuntime<TDate>,
    runAt: number,
    delay: number,
    callback: () => void,
  ): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_INTERVAL,
      runtime,
      this,
      runAt,
      this._nextSeq++,
      delay,
      callback,
    );
    this._insert(entry);
    this._linkLive(entry);
    return entry;
  }

  registerRecurring(
    runtime: IRuntime<TDate>,
    runAt: number,
    callback: () => IDurationSpec | false,
  ): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_RECURRING,
      runtime,
      this,
      runAt,
      this._nextSeq++,
      0,
      callback,
    );
    this._insert(entry);
    this._linkLive(entry);
    return entry;
  }

  /**
   * Removes `entry` from the heap array if still pending, and from the live list - called once
   * per entry, from its own (idempotency-guarded) `dispose()`.
   */
  retireEntry(entry: DueEntry<TDate>): void {
    if (entry.heapIndex >= 0) this._removeAtIndex(entry.heapIndex);
    this._unlinkLive(entry);
  }

  /**
   * Disposes every live entry (heap-pending or already-fired-but-not-yet-individually-disposed)
   * and empties both the heap array and the live list. Detaches everything up front so each
   * entry's own `dispose()` - which reenters `retireEntry()` - finds nothing left to unlink
   * rather than mutating the structures this loop is walking.
   */
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

  /** Appends `entry` at the end of the heap and sifts it up into place. */
  private _insert(entry: DueEntry<TDate>): void {
    const index = this._entries.length;
    this._entries.push(entry);
    this._siftUp(entry, index);
  }

  /** Removes whatever entry occupies heap position `index` and re-seats the heap around the gap. */
  private _removeAtIndex(index: number): void {
    const entries = this._entries;
    entries[index].heapIndex = -1;
    const lastIndex = entries.length - 1;
    if (index === lastIndex) {
      entries.pop();
      return;
    }
    const moved = entries.pop()!;
    const parent = entries[(index - 1) >>> 1];
    /*
      The replacement is either smaller or larger than what used to sit here, never both, so
      only one direction can ever move it - comparing against the parent picks the right one
      instead of unconditionally trying both.
    */
    //#region inlining of isBefore
    if (
      index > 0 &&
      (moved.runAt < parent.runAt || (moved.runAt === parent.runAt && moved.seq < parent.seq))
    ) {
      //#endregion inlining of isBefore
      this._siftUp(moved, index);
    } else {
      this._siftDown(moved, index);
    }
  }

  /** Hole-algorithm siftUp: shifts ancestors down one slot at a time, then seats `moving` once. */
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

  /** Hole-algorithm siftDown: shifts the smaller child up one slot at a time, then seats `moving` once. */
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
   * Runs any pending callbacks due at or before `now`, running a microtask checkpoint over
   * `microtasks` after each one - each due callback is a task, and the host runs a checkpoint at
   * the end of every task. A callback that throws is handled per {@link shouldRethrowTimerErrors},
   * and the checkpoint still runs on the way out, as it would natively.
   */
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

  /**
   * Drains due entries up to `targetTimestamp`, calling `setCurrentTimestamp` with each due
   * entry's own `runAt` right before firing it - a self-rescheduling callback must see the clock
   * at *its own* due time, not already at the final target, or its new entry always lands past
   * the target and the whole chain fires only once, however large the gap. Kept as its own tight
   * loop here rather than in the caller: one method call per due batch instead of bouncing back
   * out to the runtime on every single entry measurably cut per-tick overhead for advance()-heavy
   * workloads (many ticks in one call).
   */
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

/**
 * Base class for all deterministic runtime classes.
 */
export abstract class BaseDeterministicRuntime<TDate>
  extends BaseRuntime<TDate>
  implements IDeterministicRuntime<TDate>
{
  #dueQueue: DueHeap<TDate>;
  #dueDrainingDisabled = false;
  #microtasks: MicrotaskQueue;
  #rethrowTimerErrors: boolean;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    const performance = new DeterministicPerformance<TDate>();
    super(localTimezone, converter, performance);
    this.#dueQueue = new DueHeap<TDate>();
    this.#microtasks = new MicrotaskQueue();
    this.#rethrowTimerErrors = shouldRethrowTimerErrors();
    performance.initialize(this);
  }

  /**
   * Produces the local `TDate` for the clock read this call represents. Called by
   * {@link localNow}, after which any callbacks that became due are run.
   */
  protected abstract localNowImpl(): TDate;
  /**
   * Produces the UTC `TDate` for the clock read this call represents. Called by {@link utcNow},
   * after which any callbacks that became due are run.
   */
  protected abstract utcNowImpl(): TDate;
  /**
   * Produces the timestamp for {@link timestampNow}. Unlike {@link localNowImpl}/
   * {@link utcNowImpl}, must be side-effect-free - see {@link ITimestampClock.timestampNow}.
   */
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
  /**
   * Permanently stops {@link mayRunDueCallbacks} from draining - called once, from
   * {@link BaseFixedRuntime}'s constructor, instead of overriding that method: an
   * overridden-to-near-no-op virtual call is still a virtual call, and this hot path is called on
   * every timer registration and every clock read.
   */
  protected disableDueDraining(): void {
    this.#dueDrainingDisabled = true;
  }

  /**
   * Narrows {@link BaseRuntime.timers}: a deterministic runtime's timers also expose
   * {@link IDeterministicTimers.drainMicrotasks}.
   */
  override get timers(): IDeterministicTimers {
    return this;
  }

  //#region microtasks management
  /**
   * Queues `callback` on this runtime's own microtask queue. See {@link ITimers.queueMicrotask}.
   */
  queueMicrotask(callback: () => void): void {
    this.#microtasks.push(callback);
  }
  /**
   * Runs this runtime's pending microtasks. See {@link IDeterministicTimers.drainMicrotasks}.
   *
   * A no-op when called while a checkpoint on this runtime is already draining - see
   * {@link MicrotaskQueue}.
   */
  drainMicrotasks(): void {
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

  /**
   * See {@link DueHeap.drainDueAdvancing}. No {@link disableDueDraining} guard here, unlike
   * {@link mayRunDueCallbacks}: this is only ever reached through {@link BaseManualRuntime.advance},
   * and only {@link BaseFixedRuntime} - a sibling of {@link BaseManualRuntime}, not a base of it -
   * ever disables draining.
   */
  protected drainDueAdvancing(
    targetTimestamp: number,
    setCurrentTimestamp: (runAt: number) => void,
  ): void {
    this.#dueQueue.drainDueAdvancing(targetTimestamp, setCurrentTimestamp, this.#microtasks);
  }

  /**
   * The due-heap is already this runtime's authoritative record of every outstanding timer, so
   * unlike the base class, tracking handles in a separate Set here would be pure duplication.
   */
  protected override disposeTimersHandles(): void {
    this.#dueQueue.disposeAll();
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
    let msDelay = toDuration(delay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerTimeout(this, now + msDelay, callback);
    this.mayRunDueCallbacks(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
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
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerRecurring(this, now + msInitialDelay, callback);
    this.mayRunDueCallbacks(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }
  //#endregion timers
}

/**
 * Base class for a deterministically sequential runtime
 */
export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  /**
   * The epoch-milliseconds timestamps to step through, one per clock read. Once the last one is
   * reached, the clock keeps returning it.
   */
  protected _sequentialTimestamps: number[];
  #sequentialIndex = 0;
  /**
   * @param localTimezone the local timezone this runtime is configured with.
   * @param sequentialTimes the sequence of times to step through, one per clock read.
   * @param converter the time converter for this runtime's date library, provided by the concrete subclass.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, converter);
    this._sequentialTimestamps = sequentialTimes.map((t) => this.convertToEpochTimestampImpl(t));
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
  /**
   * Side-effect-free, as required by {@link ITimestampClock.timestampNow}: returns the timestamp
   * at the current position in the sequence without consuming it or running due callbacks, unlike
   * {@link localNowImpl}/{@link utcNowImpl}.
   */
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

/**
 * Base class for a deterministically fixed runtime
 */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  /**
   * @param localTimezone the local timezone this runtime is configured with.
   * @param fixedTime the time this runtime's clock stays fixed at.
   * @param converter the time converter for this runtime's date library, provided by the concrete subclass.
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

/**
 * Base class for a deterministically manual runtime
 */
export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  /**
   * @param localTimezone the local timezone this runtime is configured with.
   * @param fixedTime the initial time of this runtime's clock, before any {@link advance} call.
   * @param converter the time converter for this runtime's date library, provided by the concrete subclass.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  /**
   * Overwrites the current time of this runtime's clock with `time`.
   */
  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToEpochTimestampImpl(time);
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

  /**
   * Moves this clock's time forward (or backward, for negative values) by the given amount,
   * applying `years`, `months`, `days`, `hours`, `minutes`, `seconds`, then `milliseconds` in
   * that fixed order - see {@link IAdvanceOptions}. Any due callbacks are run before this
   * returns, per {@link ITimers}.
   */
  advance(advanceConfiguration: IAdvanceOptions): IManualRuntime<TDate> {
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

  /** Returns `time` shifted by `years` years, using the date library's own calendar arithmetic. */
  protected abstract advanceYears(time: TDate, years: number): TDate;
  /** Returns `time` shifted by `months` months, using the date library's own calendar arithmetic. */
  protected abstract advanceMonths(time: TDate, months: number): TDate;
  /** Returns `time` shifted by `days` days. */
  protected abstract advanceDays(time: TDate, days: number): TDate;
  /** Returns `time` shifted by `hours` hours. */
  protected abstract advanceHours(time: TDate, hours: number): TDate;
  /** Returns `time` shifted by `minutes` minutes. */
  protected abstract advanceMinutes(time: TDate, minutes: number): TDate;
  /** Returns `time` shifted by `seconds` seconds. */
  protected abstract advanceSeconds(time: TDate, seconds: number): TDate;
  /** Returns `time` shifted by `milliseconds` milliseconds. */
  protected abstract advanceMilliseconds(time: TDate, milliseconds: number): TDate;
}
