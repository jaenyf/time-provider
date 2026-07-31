import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  IAdvanceOptions,
  IManualClock,
  IManualRuntime,
  ITimeConverter,
  SetIntervalHandle,
  SetTimeoutHandle,
  TimezoneDefinition,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

type TimerKind = 0 | 1;
const TIMER_KIND_TIMEOUT: TimerKind = 0;
const TIMER_KIND_INTERVAL: TimerKind = 1;

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
   * Whether this entry is a one-shot timeout or a repeating interval
   */
  kind: TimerKind;
  /**
   * The callback to run
   */
  callback: () => void;
  /**
   * The heap instance owning this entry. Guards against a handle from one runtime being used to
   * clear an entry in a different runtime's heap.
   */
  readonly owner: DueHeap;
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
   * Equivalent to `pop()` followed by `push()` of the same entry, but without the redundant remove/reinsert.
   */
  fixRootAfterIncrease(): void {
    this._siftDown(0);
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
      // Explicit temp-variable swap, not array-destructuring - measured faster here since
      // sift operations run on every push/pop and this is by far the hottest line in the heap.
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

  abstract peekTimestamp(): number;
  protected abstract localNowImpl(): TDate;
  protected abstract utcNowImpl(): TDate;
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
    const entry = handle as DueEntry;
    if (entry.owner === queue && entry.kind === kind) {
      queue.remove(entry);
    }
  }

  /**
   * Runs any pending callbacks due at or before `now`.
   * @param now
   * @param queue
   */
  private static drainDueCallbacks(now: number, queue: DueHeap): void {
    /*
      Peeking the heap's root instead of scanning the whole map means a `now()` call where
      nothing is due - the common case - costs O(1), not O(N). Timeouts and intervals share a
      single heap ordered by (runAt, seq), so a mixed batch of due timers fires in true
      chronological order - the same order a real timer queue would use - rather than draining
      every due timeout before any due interval is even considered.
    */
    let due: DueEntry | undefined;
    while ((due = queue.peek()) !== undefined && due.runAt <= now) {
      if (due.kind === TIMER_KIND_TIMEOUT) {
        queue.pop();
        due.callback();
      } else {
        /*
          Rearm and re-sift BEFORE invoking the callback. It matters to ensure there's nothing
          stale for a reentrant call to observe.
        */
        const callback = due.callback;
        due.runAt += due.delay || 1;
        due.seq = queue.nextSeq();
        queue.fixRootAfterIncrease();
        callback();
      }
    }
  }

  private static queueDueEntry(
    runtime: BaseDeterministicRuntime<any>,
    nowTimestamp: number,
    delayMs: number,
    repeatDelayMs: number,
    kind: TimerKind,
    callback: () => void,
  ): DueEntry {
    const queue = runtime.#dueQueue;
    const entry: DueEntry = {
      runAt: nowTimestamp + delayMs,
      seq: queue.nextSeq(),
      heapIndex: -1,
      delay: repeatDelayMs,
      kind,
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
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
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
    ) as unknown as SetTimeoutHandle;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    BaseDeterministicRuntime.clearDueHandle(handle, this.#dueQueue, TIMER_KIND_TIMEOUT);
  }
  //#endregion setTimeout

  //#region setInterval
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
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
    ) as unknown as SetIntervalHandle;
  }
  clearInterval(handle: SetIntervalHandle) {
    BaseDeterministicRuntime.clearDueHandle(handle, this.#dueQueue, TIMER_KIND_INTERVAL);
  }
  //#endregion setInterval
}

/**
 * Base class for a deterministically sequential runtime
 */
export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  protected _sequentialTimestamps: number[];
  #sequentialIndex = 0;
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
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

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
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToEpochTimestampImpl(time);
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

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

  protected abstract advanceYears(time: TDate, years: number): TDate;
  protected abstract advanceMonths(time: TDate, months: number): TDate;
  protected abstract advanceDays(time: TDate, days: number): TDate;
  protected abstract advanceHours(time: TDate, hours: number): TDate;
  protected abstract advanceMinutes(time: TDate, minutes: number): TDate;
  protected abstract advanceSeconds(time: TDate, seconds: number): TDate;
  protected abstract advanceMilliseconds(time: TDate, milliseconds: number): TDate;
}
