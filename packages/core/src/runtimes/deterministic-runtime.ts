import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  DueHandle,
  IAdvanceOptions,
  IManualClock,
  IManualRuntime,
  ITimeConverter,
  TimerKind,
  TimezoneDefinition,
} from "../types/types.ts";
import { TIMER_KIND_INTERVAL, TIMER_KIND_RECURRING, TIMER_KIND_TIMEOUT } from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

interface DueEntry {
  /**
   * Timestamp of when to run the callback
   */
  runAt: number;
  /**
   * Ordering for callbacks having the same runAt value
   */
  seq: number;
  /**
   * Current position of this entry in the owning heap's backing array, or -1 when the entry
   * isn't currently stored in the heap (fired or cancelled).
   */
  heapIndex: number;
  /**
   * Repeat period in ms, only meaningful for TIMER_KIND_INTERVAL entries
   */
  delay: number;
  /**
   * Whether this entry is a one-shot timeout, a repeating interval, or a recurring schedule
   */
  kind: TimerKind;
  /**
   * The callback to run. For TIMER_KIND_RECURRING, its return value (`number | false`) decides
   * the next run; for the other kinds it's ignored.
   */
  callback: (() => void) | (() => number | false);
  /**
   * The heap instance owning this entry. Guards against a handle from one runtime being used to
   * clear an entry in a different runtime's heap.
   */
  readonly owner: DueHeap;
  /**
   * Set by `clearRecurring`; consulted right after `callback` returns to decide whether to rearm
   * a TIMER_KIND_RECURRING entry. That entry is physically removed from the heap before its
   * callback runs (its next due time isn't known until the callback returns), so a `clearRecurring`
   * call reentrant to that same entry's own callback has nothing left in the heap to remove - this
   * flag is how it still stops the rearm the enclosing drain is about to do once callback returns.
   */
  cancelled: boolean;
}

function isBefore(a: DueEntry, b: DueEntry): boolean {
  const ar = a.runAt;
  const br = b.runAt;
  return ar < br || (ar === br && a.seq < b.seq);
}

class DueHeap {
  private _entries: DueEntry[] = [];
  private _nextSeq = 1;

  nextSeq(): number {
    return this._nextSeq++;
  }

  peek(): DueEntry | undefined {
    return this._entries[0];
  }

  push(entry: DueEntry): void {
    const entries = this._entries;
    entry.heapIndex = entries.length;
    entries.push(entry);
    this._siftUp(entry.heapIndex);
  }

  pop(): DueEntry | undefined {
    return this._removeAt(0);
  }

  /** Removes an arbitrary entry in O(log n) using its tracked heapIndex; no-op if already removed. */
  remove(entry: DueEntry): void {
    if (entry.heapIndex >= 0) {
      this._removeAt(entry.heapIndex);
    }
  }

  /**
   * Equivalent to `pop()` followed by `push()` of the same entry, but without the redundant
   * remove/reinsert. Takes the entry rather than assuming the root: a plain interval never runs
   * user code before calling this (safe to assume root), but a recurring entry's callback is
   * arbitrary reentrant user code that may have already moved this entry (or others) around
   * the heap by the time its result comes back.
   */
  fixAfterIncrease(entry: DueEntry): void {
    this._siftDown(entry.heapIndex);
  }

  private _removeAt(index: number): DueEntry {
    const entries = this._entries;
    const lastIndex = entries.length - 1;
    const removed = entries[index];
    removed.heapIndex = -1;
    if (index !== lastIndex) {
      const last = entries.pop()!;
      entries[index] = last;
      last.heapIndex = index;
      /*
        The replacement is either smaller or larger than what used to sit here, never both, so
        only one direction can ever move it - checking against the parent picks the right one
        instead of unconditionally trying both.
      */
      const parentIndex = (index - 1) >>> 1;
      if (index > 0 && isBefore(last, entries[parentIndex])) {
        this._siftUp(index);
      } else {
        this._siftDown(index);
      }
    } else {
      entries.pop();
    }
    return removed;
  }

  private _siftUp(index: number): void {
    const entries = this._entries;
    while (index > 0) {
      const parentIndex = (index - 1) >>> 1;
      const current = entries[index];
      const parent = entries[parentIndex];
      if (!isBefore(current, parent)) break;
      /*
        Explicit temp-variable swap, not array-destructuring
        Measured faster here since sift operations run on every push/pop and this is by far the hottest line in the heap.
      */
      entries[parentIndex] = current;
      entries[index] = parent;
      current.heapIndex = parentIndex;
      parent.heapIndex = index;
      index = parentIndex;
    }
  }

  private _siftDown(index: number): void {
    const entries = this._entries;
    const length = entries.length;
    for (;;) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;
      let smallestEntry = entries[index];
      if (left < length) {
        const leftEntry = entries[left];
        if (isBefore(leftEntry, smallestEntry)) {
          smallest = left;
          smallestEntry = leftEntry;
        }
      }
      if (right < length) {
        const rightEntry = entries[right];
        if (isBefore(rightEntry, smallestEntry)) {
          smallest = right;
          smallestEntry = rightEntry;
        }
      }
      if (smallest === index) break;
      const swappedIndex = entries[index];
      entries[smallest] = swappedIndex;
      entries[index] = smallestEntry;
      swappedIndex.heapIndex = smallest;
      smallestEntry.heapIndex = index;
      index = smallest;
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
   * Returns the current timestamp without advancing the deterministic clock or running due
   * callbacks, unlike {@link timestampNow}.
   */
  abstract peekTimestamp(): number;
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
   * Produces the timestamp for the clock read this call represents. Called by
   * {@link timestampNow}, after which any callbacks that became due are run.
   */
  protected abstract timestampNowImpl(): number;

  timestampNow(): number {
    return this.timestampNowImpl();
  }
  localNow(): TDate {
    return this.localNowImpl();
  }
  utcNow(): TDate {
    return this.utcNowImpl();
  }

  //#region heap management
  private static clearDueHandle(handle: unknown, queue: DueHeap, kind: TimerKind): void {
    if (handle === undefined || handle === null) {
      return;
    }
    const entry = handle as DueEntry;
    if (entry.owner === queue && entry.kind === kind) {
      queue.remove(entry);
    }
  }

  private static clearRecurringHandle(handle: unknown, queue: DueHeap): void {
    if (handle === undefined || handle === null) {
      return;
    }
    const entry = handle as DueEntry;
    if (entry.owner !== queue || entry.kind !== TIMER_KIND_RECURRING) {
      return;
    }
    entry.cancelled = true;
    queue.remove(entry);
  }

  /**
   * Runs any pending callbacks due at or before `now`.
   * @param now
   * @param queue
   */
  private static drainDueCallbacks(now: number, queue: DueHeap): void {
    /*
      Peeking the heap's root instead of scanning the whole map means a `now()` call where
      nothing is due - the common case - costs O(1), not O(N). Timeouts, intervals and recurring
      schedules share a single heap ordered by (runAt, seq), so a mixed batch of due timers fires
      in true chronological order - the same order a real timer queue would use - rather than
      draining every due timeout before any due interval/recurring entry is even considered.
    */
    let due: DueEntry | undefined;
    while ((due = queue.peek()) !== undefined && due.runAt <= now) {
      if (due.kind === TIMER_KIND_TIMEOUT) {
        queue.pop();
        due.callback();
      } else if (due.kind === TIMER_KIND_INTERVAL) {
        /*
          Rearm and re-sift BEFORE invoking the callback. It matters to ensure there's nothing
          stale for a reentrant call to observe. Safe to assume `due` is still root here: nothing
          but this loop touches the heap between the `peek()` above and this rearm.
        */
        const callback = due.callback;
        due.runAt += due.delay || 1;
        due.seq = queue.nextSeq();
        queue.fixAfterIncrease(due);
        callback();
      } else {
        /*
          TIMER_KIND_RECURRING: unlike a plain interval, the next delay isn't known ahead of time
          - callback's return value decides it, typically from state the run itself just updated
          (e.g. a counter). There's never a next occurrence already committed by the time it's
          decided: cancelling (via `cancelled`, or callback returning false) always takes effect
          immediately, with no trailing extra run - unlike clearTimeout/clearInterval, which can
          only ever be forward-looking since by definition they race an already-scheduled
          callback.
        */
        const callback = due.callback as () => number | false;
        const previousRunAt = due.runAt;
        queue.remove(due);
        const next = callback();
        if (!due.cancelled && next !== false) {
          due.runAt = previousRunAt + (next < 1 ? 1 : next);
          due.seq = queue.nextSeq();
          queue.push(due);
        }
      }
    }
  }

  private static queueDueEntry(
    runtime: BaseDeterministicRuntime<any>,
    nowTimestamp: number,
    delayMs: number,
    repeatDelayMs: number,
    kind: TimerKind,
    callback: (() => void) | (() => number | false),
  ): DueEntry {
    const queue = runtime.#dueQueue;
    const entry: DueEntry = {
      runAt: nowTimestamp + delayMs,
      seq: queue.nextSeq(),
      heapIndex: -1,
      delay: repeatDelayMs,
      kind,
      cancelled: false,
      callback,
      owner: queue,
    };
    queue.push(entry);
    runtime.mayRunDueCallbacks(nowTimestamp);
    return entry;
  }
  //#endregion heap management

  protected mayRunDueCallbacks(nowTimestamp: number): void {
    BaseDeterministicRuntime.drainDueCallbacks(nowTimestamp, this.#dueQueue);
  }

  //#region setTimeout
  /**
   * Schedules `callback` on this runtime's deterministic clock. See {@link IScheduler} for when
   * it actually runs.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle {
    let delay = millisecondsDelay;
    if (delay === undefined || delay < 0) delay = 0;
    const now = this.peekTimestamp();
    return BaseDeterministicRuntime.queueDueEntry(
      this,
      now,
      delay,
      0,
      TIMER_KIND_TIMEOUT,
      callback,
    ) as unknown as DueHandle;
  }
  /**
   * Cancels a pending timeout scheduled via {@link setTimeout}. A no-op if it already ran or was
   * already cleared.
   */
  clearTimeout(handle: DueHandle) {
    BaseDeterministicRuntime.clearDueHandle(handle, this.#dueQueue, TIMER_KIND_TIMEOUT);
  }
  //#endregion setTimeout

  //#region setInterval
  /**
   * Schedules `callback` to repeat on this runtime's deterministic clock. See {@link IScheduler}
   * for when each run actually happens.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle {
    let delay = millisecondsDelay;
    if (delay === undefined || delay < 0) delay = 0;
    const now = this.peekTimestamp();
    return BaseDeterministicRuntime.queueDueEntry(
      this,
      now,
      delay,
      delay,
      TIMER_KIND_INTERVAL,
      callback,
    ) as unknown as DueHandle;
  }
  /**
   * Cancels a pending interval scheduled via {@link setInterval}. A no-op if it was already
   * cleared.
   */
  clearInterval(handle: DueHandle) {
    BaseDeterministicRuntime.clearDueHandle(handle, this.#dueQueue, TIMER_KIND_INTERVAL);
  }
  //#endregion setInterval

  //#region setRecurring
  /**
   * Schedules `callback` to run once, `initialDelay` from now, then again after whatever delay
   * `callback` itself returns. Returning `false` stops the schedule; see {@link IScheduler} for
   * when each run actually happens.
   */
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle {
    let delay = initialDelay;
    if (delay === undefined || delay < 0) delay = 0;
    const now = this.peekTimestamp();
    return BaseDeterministicRuntime.queueDueEntry(
      this,
      now,
      delay,
      0,
      TIMER_KIND_RECURRING,
      callback,
    ) as unknown as DueHandle;
  }
  /**
   * Cancels a pending recurring schedule started via {@link setRecurring}. A no-op if it already
   * stopped (`callback` returned `false`) or was already cleared.
   */
  clearRecurring(handle: DueHandle): void {
    BaseDeterministicRuntime.clearRecurringHandle(handle, this.#dueQueue);
  }
  //#endregion setRecurring
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
    sequentialTimes: (string | number | TDate)[],
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, converter);
    this._sequentialTimestamps = sequentialTimes.map((t) => this.convertToEpochTimestampImpl(t));
  }

  localNowImpl(): TDate {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    return this.convertToLocalDateImpl(this.localTimezone, nowTimestamp);
  }
  utcNowImpl(): TDate {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    return this.convertToUtcDateImpl(nowTimestamp);
  }
  timestampNowImpl(): number {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunDueCallbacks(nowTimestamp);
    return nowTimestamp;
  }

  /**
   * Returns the timestamp at the current position in the sequence without advancing it.
   */
  peekTimestamp(): number {
    return this._sequentialTimestamps.length > 0
      ? this._sequentialTimestamps[this.#sequentialIndex]
      : 0;
  }

  private getNextSequentialTimestamp(): number {
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
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  /**
   * Never runs due callbacks: on a fixed clock, time never advances, so scheduled callbacks are
   * never due. See {@link IScheduler}.
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
    fixedTime: string | number | TDate,
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
   * returns, per {@link IScheduler}.
   */
  advance(advanceConfiguration: IAdvanceOptions): IManualRuntime<TDate> {
    let time = this.utcNow();

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

    this.setDeterminedTime(time);
    const now = this.peekTimestamp();
    this.mayRunDueCallbacks(now);
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
