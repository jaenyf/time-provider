import { type IDurationSpec, toDuration } from "../helpers/branded-types.ts";
import { shouldRethrowTimerErrors } from "../environment.ts";
import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  IScheduledHandle,
  IAdvanceOptions,
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
 * callers, so scheduling a timer only ever allocates this one object (it used to allocate a
 * separate heap entry plus a wrapping handle). Deliberately its own lightweight implementation of
 * {@link IScheduledHandle} rather than reusing the shared `ScheduledHandle` (which system-runtime
 * still uses as-is): plain fields here, no extra indirection through an unrelated
 * `nativeHandle`/`setNativeHandle` slot that only system-runtime's native-timer wrapping needs.
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
  /** Meaningful only for TIMER_KIND_RECURRING; false on the other kinds. */
  cancelled: boolean;
  /** Return value decides the next run for TIMER_KIND_RECURRING; ignored on the other kinds. */
  callback: (() => void) | (() => IDurationSpec | false);
  readonly kind: ScheduledHandleKind;
  isDisposed: boolean;
  /**
   * The heap instance owning this entry. Guards against a handle from one runtime being used to
   * clear an entry in a different runtime's heap.
   */
  readonly heap: DueHeap<TDate>;
  /**
   * Links in the heap's intrusive "every entry ever created, until individually disposed" list -
   * separate from the heap's own array (a fired or cancelled entry leaves that array, but must
   * stay reachable here so the runtime's own dispose() can still mark it disposed later).
   */
  _livePrev: DueEntry<TDate> | undefined;
  _liveNext: DueEntry<TDate> | undefined;
  readonly #runtime: IRuntime<TDate>;
  #abortController?: AbortController;

  constructor(
    kind: ScheduledHandleKind,
    runtime: IRuntime<TDate>,
    heap: DueHeap<TDate>,
    runAt: number,
    seq: number,
    delay: number,
    callback: (() => void) | (() => IDurationSpec | false),
  ) {
    this.kind = kind;
    this.#runtime = runtime;
    this.heap = heap;
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
    if (this.#abortController !== undefined) {
      this.#abortController.abort("Timer handle is being disposed");
    }
    this.#runtime.clearTimer(this);
    this.isDisposed = true;
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
   * entry's own `dispose()` - which reenters `retireEntry()` - finds nothing left to unlink rather
   * than mutating the structures this loop is walking.
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

  registerTimeout(
    runtimeOwner: IRuntime<TDate>,
    runAt: number,
    callback: () => void,
  ): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_TIMEOUT,
      runtimeOwner,
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
    runtimeOwner: IRuntime<TDate>,
    runAt: number,
    delay: number,
    callback: () => void,
  ): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_INTERVAL,
      runtimeOwner,
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
    runtimeOwner: IRuntime<TDate>,
    runAt: number,
    callback: () => IDurationSpec | false,
  ): DueEntry<TDate> {
    const entry = new DueEntry(
      SCHEDULED_TIMER_KIND_RECURRING,
      runtimeOwner,
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
   * Runs any pending callbacks due at or before `now`.
   * A callback that throws is handled per {@link shouldRethrowTimerErrors}
   */
  drainDue(now: number): void {
    const entries = this._entries;
    const rethrowTimersErrors = this._shouldRethrowTimerErrors;

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
          // root.kind === SCHEDULED_TIMER_KIND_RECURRING here guarantees callback has this shape;
          // callback's static type stays the union of all three kinds so DueEntry doesn't need a
          // discriminated per-kind subclass just to type this one call.
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
          }
          break;
        }
      }
    }
  }
}

/**
 * Base class for all deterministic runtime classes.
 */
export abstract class BaseDeterministicRuntime<TDate> extends BaseRuntime<TDate> {
  #dueQueue: DueHeap<TDate>;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    const performance = new DeterministicPerformance<TDate>();
    super(localTimezone, converter, performance);
    this.#dueQueue = new DueHeap<TDate>();
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
  protected mayRunDueCallbacks(nowTimestamp: number): void {
    this.#dueQueue.drainDue(nowTimestamp);
  }

  /** The `runAt` of the earliest pending due entry, or `undefined` if none is scheduled. */
  protected peekNextDueTimestamp(): number | undefined {
    return this.#dueQueue.peekRunAt();
  }

  /**
   * The due-heap is already this runtime's authoritative record of every outstanding timer, so
   * unlike the base class, tracking handles in a separate `Set` here would be pure duplication.
   * disposeTimersHandles() sweeps the heap directly instead; once()/every()/recurring() below wire
   * up abort-signal disposal inline rather than routing through trackHandle()/untrackHandle() -
   * measured as a real cost on this hot path (an overridden-to-near-no-op virtual call is still a
   * virtual call), so those two are unused here and left unoverridden.
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
    if (entry.heap === this.#dueQueue) {
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
  }

  /**
   * Never runs due timer callbacks: on a fixed clock, time never advances, so scheduled callbacks are
   * never due. See {@link ITimers}.
   */
  protected override mayRunDueCallbacks(_nowTimestamp: number): void {
    /* time is frozen */
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
    let nextDue = this.peekNextDueTimestamp();
    while (nextDue !== undefined && nextDue <= targetTimestamp) {
      this._sequentialTimestamps[0] = nextDue;
      this.mayRunDueCallbacks(nextDue);
      nextDue = this.peekNextDueTimestamp();
    }

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
