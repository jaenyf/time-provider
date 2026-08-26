import { toInstant, type IDurationSpec, toDuration } from "../helpers/branded-types.ts";
import { shouldRethrowTimerErrors } from "../environment.ts";
import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  IScheduledHandle,
  IAdvanceOptions,
  IManualClock,
  IManualRuntime,
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
import { ScheduledHandle } from "./scheduled-handle.ts";

interface BaseDueEntry {
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
  /**
   * The heap instance owning this entry. Guards against a handle from one runtime being used to
   * clear an entry in a different runtime's heap.
   */
  readonly owner: DueHeap;
}

interface TimeoutEntry extends BaseDueEntry {
  readonly kind: typeof SCHEDULED_TIMER_KIND_TIMEOUT;
  callback: () => void;
}

interface IntervalEntry extends BaseDueEntry {
  readonly kind: typeof SCHEDULED_TIMER_KIND_INTERVAL;
  callback: () => void;
}

interface RecurringEntry extends BaseDueEntry {
  readonly kind: typeof SCHEDULED_TIMER_KIND_RECURRING;
  /** Return value decides the next run; `false` stops the schedule. */
  callback: () => IDurationSpec | false;
}

type DueEntry = TimeoutEntry | IntervalEntry | RecurringEntry;

/** Binary min-heap of due entries, ordered by `(runAt, seq)`. */
class DueHeap {
  private _entries: DueEntry[] = [];
  private _nextSeq = 1;
  private _shouldRethrowTimerErrors: boolean;
  constructor() {
    this._shouldRethrowTimerErrors = shouldRethrowTimerErrors();
  }

  /** The `runAt` of the earliest pending entry, or `undefined` if the queue is empty. */
  peekRunAt(): number | undefined {
    return this._entries.length > 0 ? this._entries[0].runAt : undefined;
  }

  registerTimeout(runAt: number, callback: () => void): TimeoutEntry {
    const entry: TimeoutEntry = {
      runAt,
      seq: this._nextSeq++,
      heapIndex: -1,
      delay: 0,
      cancelled: false,
      kind: SCHEDULED_TIMER_KIND_TIMEOUT,
      callback,
      owner: this,
    };
    this._insert(entry);
    return entry;
  }

  registerInterval(runAt: number, delay: number, callback: () => void): IntervalEntry {
    const entry: IntervalEntry = {
      runAt,
      seq: this._nextSeq++,
      heapIndex: -1,
      delay,
      cancelled: false,
      kind: SCHEDULED_TIMER_KIND_INTERVAL,
      callback,
      owner: this,
    };
    this._insert(entry);
    return entry;
  }

  registerRecurring(runAt: number, callback: () => IDurationSpec | false): RecurringEntry {
    const entry: RecurringEntry = {
      runAt,
      seq: this._nextSeq++,
      heapIndex: -1,
      delay: 0,
      cancelled: false,
      kind: SCHEDULED_TIMER_KIND_RECURRING,
      callback,
      owner: this,
    };
    this._insert(entry);
    return entry;
  }

  /** Removes an arbitrary entry in O(log n) using its tracked heapIndex; no-op if already removed. */
  remove(entry: DueEntry): void {
    if (entry.heapIndex >= 0) this._removeAtIndex(entry.heapIndex);
  }

  /** Appends `entry` at the end of the heap and sifts it up into place. */
  private _insert(entry: DueEntry): void {
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
  private _siftUp(moving: DueEntry, index: number): void {
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
  private _siftDown(moving: DueEntry, index: number): void {
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
          let next: IDurationSpec | false;

          if (rethrowTimersErrors) {
            next = root.callback();
          } else {
            try {
              next = root.callback();
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
  #dueQueue: DueHeap;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    const performance = new DeterministicPerformance<TDate>();
    super(localTimezone, converter, performance);
    this.#dueQueue = new DueHeap();
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
  private static clearDueHandle(handle: unknown, queue: DueHeap, kind: ScheduledHandleKind): void {
    if (handle === undefined || handle === null) return;
    const entry = handle as DueEntry;
    if (entry.owner !== queue || entry.kind !== kind) return;
    entry.cancelled = true;
    queue.remove(entry);
  }

  //#endregion heap management

  protected mayRunDueCallbacks(nowTimestamp: number): void {
    this.#dueQueue.drainDue(nowTimestamp);
  }

  /** The `runAt` of the earliest pending due entry, or `undefined` if none is scheduled. */
  protected peekNextDueTimestamp(): number | undefined {
    return this.#dueQueue.peekRunAt();
  }

  //#region timers
  clearTimer<TNativeHandle>(handle: ScheduledHandle<TDate, TNativeHandle>): void {
    BaseDeterministicRuntime.clearDueHandle(handle.nativeHandle, this.#dueQueue, handle.kind);
    this.untrackHandle(handle);
  }
  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    let msDelay = toDuration(delay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerTimeout(now + msDelay, callback);
    this.mayRunDueCallbacks(now);
    return this.trackHandle(
      new ScheduledHandle(SCHEDULED_TIMER_KIND_TIMEOUT, this, entry),
      options,
    );
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    let msDelay = toDuration(delay);
    if (msDelay < 0) msDelay = 0 as DurationMilliseconds;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerInterval(now + msDelay, msDelay, callback);
    this.mayRunDueCallbacks(now);
    return this.trackHandle(
      new ScheduledHandle(SCHEDULED_TIMER_KIND_INTERVAL, this, entry),
      options,
    );
  }

  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): IScheduledHandle {
    let msInitialDelay = initialDelay !== undefined ? toDuration(initialDelay) : 0;
    const now = this.timestampNow();
    const entry = this.#dueQueue.registerRecurring(now + msInitialDelay, callback);
    this.mayRunDueCallbacks(now);
    return this.trackHandle(
      new ScheduledHandle(SCHEDULED_TIMER_KIND_RECURRING, this, entry),
      options,
    );
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
    return this.convertToLocalDateImpl(
      this.localTimezone,
      toInstant({ milliseconds: nowTimestamp }),
    );
  }
  utcNowImpl(): TDate {
    const nowTimestamp = this.consumeNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    return this.convertToUtcDateImpl(toInstant({ milliseconds: nowTimestamp }));
  }
  /**
   * Side-effect-free, as required by {@link ITimestampClock.timestampNow}: returns the timestamp
   * at the current position in the sequence without consuming it or running due callbacks, unlike
   * {@link localNowImpl}/{@link utcNowImpl}.
   */
  timestampNowImpl(): EpochMilliseconds {
    return toInstant({
      milliseconds:
        this._sequentialTimestamps.length > 0
          ? this._sequentialTimestamps[this.#sequentialIndex]
          : 0,
    });
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
