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
   * The entry has been discared, callback should not/no more execute
   */
  discarded: boolean;
  /**
   * The callback to run
   */
  callback: () => void;
  /**
   * The queue instance owning this entry
   */
  readonly owner: DueHeap<DueEntry>;
}

type TimeoutEntry = DueEntry;

type IntervalEntry = DueEntry & {
  delay: number;
};

/** Total order used by every DueEntry container: `runAt` first, `seq` only breaks ties. */
function isBefore<T extends DueEntry>(a: T, b: T): boolean {
  return a.runAt !== b.runAt ? a.runAt < b.runAt : a.seq < b.seq;
}

/**
 * Minimal binary min-heap keyed by `(runAt, seq)`
 */
class DueHeap<T extends DueEntry> {
  private _entries: T[] = [];

  get size(): number {
    return this._entries.length;
  }

  peek(): T | undefined {
    return this._entries[0];
  }

  push(entry: T): void {
    const entries = this._entries;
    entries.push(entry);
    this._siftUp(entries.length - 1);
  }

  pop(): T | undefined {
    const entries = this._entries;
    const top = entries[0];
    const last = entries.pop();
    if (entries.length > 0 && last !== undefined) {
      entries[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  /**
   * Re-heapifies from the root after the caller has increased the current root's own sort key in place (e.g. rearming an interval that just fired).
   * Equivalent to `pop()` followed by `push()` of the same entry, but without the redundant remove/reinsert.
   */
  fixRootAfterIncrease(): void {
    this._siftDown(0);
  }

  /** Rebuilds the heap keeping only still-live entries - an O(N) heapify, not N individual pushes. */
  compact(): void {
    this._entries = this._entries.filter((entry) => !entry.discarded);
    for (let index = (this._entries.length >> 1) - 1; index >= 0; index--) {
      this._siftDown(index);
    }
  }

  private _siftUp(index: number): void {
    const entries = this._entries;
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (!isBefore(entries[index], entries[parentIndex])) break;
      // Explicit temp-variable swap, not array-destructuring - measured faster here since
      // sift operations run on every push/pop and this is by far the hottest line in the heap.
      const parent = entries[parentIndex];
      entries[parentIndex] = entries[index];
      entries[index] = parent;
      index = parentIndex;
    }
  }

  private _siftDown(index: number): void {
    const entries = this._entries;
    for (;;) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;
      if (left < entries.length && isBefore(entries[left], entries[smallest])) {
        smallest = left;
      }
      if (right < entries.length && isBefore(entries[right], entries[smallest])) {
        smallest = right;
      }
      if (smallest === index) break;
      const swapped = entries[smallest];
      entries[smallest] = entries[index];
      entries[index] = swapped;
      index = smallest;
    }
  }
}

/**
 * Base class for all deterministic runtime classes.
 */
abstract class BaseDeterministicRuntime<TDate> extends BaseRuntime<TDate> {
  /**
   * Heap compaction runs synchronously as an ordinary step of a call already in progress
   */
  private static readonly COMPACTION_INTERVAL = 1000;

  #timeoutQueue: DueHeap<TimeoutEntry>;
  #timeoutCallCount: number;
  #nextTimeoutSeq: number;

  #intervalQueue: DueHeap<IntervalEntry>;
  #intervalCallCount: number;
  #nextIntervalSeq: number;

  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter);
    this.#timeoutQueue = new DueHeap<TimeoutEntry>();
    this.#timeoutCallCount = 0;
    this.#nextTimeoutSeq = 1;
    this.#intervalQueue = new DueHeap<IntervalEntry>();
    this.#intervalCallCount = 0;
    this.#nextIntervalSeq = 1;
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);

    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const entry: TimeoutEntry = {
      runAt,
      seq: this.#nextTimeoutSeq++,
      discarded: false,
      callback,
      owner: this.#timeoutQueue,
    };
    this.#timeoutQueue.push(entry);
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly
    // become due except (possibly) this brand-new entry - the scan below handles that correctly,
    // and cheaply (a single peek()) when, as usual, nothing is actually due yet.
    this.mayRunTimeoutCallbacks(now);
    // The entry doubles as its own opaque handle - see the `owner` field's doc comment on
    // DueEntry for why that's safe.
    return entry as unknown as SetTimeoutHandle;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    const entry = handle as unknown as TimeoutEntry;
    if (entry.owner === this.#timeoutQueue) {
      entry.discarded = true;
    }
  }
  protected mayRunTimeoutCallbacks(nowTimestamp: number): void {
    if (++this.#timeoutCallCount >= BaseDeterministicRuntime.COMPACTION_INTERVAL) {
      this.#timeoutQueue.compact();
      this.#timeoutCallCount = 0;
    }

    /*
      Peeking the heap's root instead of scanning the whole map means a `now()` call where
      nothing is due - the common case - costs O(1), not O(N). Entries are popped in true
      chronological order (see DueHeap), so simultaneously-due timeouts fire in the same
      order a real timer queue would, not in Map insertion order.
    */
    let due: TimeoutEntry | undefined;
    const queue = this.#timeoutQueue;
    while ((due = queue.peek()) !== undefined && due.runAt <= nowTimestamp) {
      queue.pop();
      if (due.discarded) continue;
      due.discarded = true;
      due.callback();
    }
  }

  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);
    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const entry: IntervalEntry = {
      runAt,
      delay: millisecondsDelay,
      seq: this.#nextIntervalSeq++,
      discarded: false,
      callback,
      owner: this.#intervalQueue,
    };
    this.#intervalQueue.push(entry);
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly become due except (possibly) this brand-new entry
    this.mayRunIntervalCallbacks(now);
    return entry as unknown as SetIntervalHandle;
  }
  clearInterval(handle: SetIntervalHandle) {
    const entry = handle as unknown as IntervalEntry;
    if (entry.owner === this.#intervalQueue) {
      entry.discarded = true;
    }
  }
  protected mayRunIntervalCallbacks(nowTimestamp: number): void {
    if (++this.#intervalCallCount >= BaseDeterministicRuntime.COMPACTION_INTERVAL) {
      this.#intervalQueue.compact();
      this.#intervalCallCount = 0;
    }

    /*
      Several intervals can each be due multiple times within the same time advance, popping/re-pushing in true chronological order matters here.
    */
    let due: IntervalEntry | undefined;
    const queue = this.#intervalQueue;
    while ((due = queue.peek()) !== undefined && due.runAt <= nowTimestamp) {
      if (due.discarded) {
        queue.pop();
        continue;
      }
      /*
        Rearm and re-sift BEFORE invoking the callback. It matters to ensure there's nothing stale for a reentrant call to observe.
      */
      const callback = due.callback;
      due.runAt += due.delay ? due.delay : 1;
      due.seq = this.#nextIntervalSeq++;
      queue.fixRootAfterIncrease();
      callback();
    }
  }

  protected timestamp(): number {
    return this.timestampImpl();
  }

  protected abstract timestampImpl(): number;

  override localNow(): TDate {
    return this.localNowImpl(this.timestampImpl());
  }
  override utcNow(): TDate {
    return this.utcNowImpl(this.timestampImpl());
  }
  protected abstract localNowImpl(nowTimestamp: number): TDate;
  protected abstract utcNowImpl(nowTimestamp: number): TDate;
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

  timestampImpl() {
    return this.peekTimestamp();
  }
  localNowImpl() {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    this.mayRunIntervalCallbacks(nowTimestamp);
    return this.convertToLocalDateImpl(this.localTimezone, nowTimestamp);
  }
  utcNowImpl() {
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    this.mayRunIntervalCallbacks(nowTimestamp);
    return this.convertToUtcDateImpl(nowTimestamp);
  }

  private peekTimestamp(): number {
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
  /* time is frozen */
  protected override mayRunTimeoutCallbacks(_nowTimestamp: number): void {}
  /* time is frozen */
  protected override mayRunIntervalCallbacks(_nowTimestamp: number): void {}
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
    const now = this.timestamp();
    this.mayRunTimeoutCallbacks(now);
    this.mayRunIntervalCallbacks(now);
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
