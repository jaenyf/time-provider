import { type IDurationSpec, toDuration } from "../helpers/branded-types.ts";
import { shouldRethrowTimerErrors } from "../environment.ts";
import { DeterministicPerformance } from "../performance/deterministic-performance.ts";
import type {
  IScheduledHandle,
  IAdvanceOptions,
  IDeterministicRuntime,
  IDeterministicMicrotasks,
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
   * `undefined` unless created via {@link DueHeap.registerSpecific} - the tag this entry was
   * registered under, and its links in that tag's own intrusive list (see {@link DueHeap._tagLists}).
   */
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
   * Discards every callback still queued, without running them. Used when the owning runtime is
   * disposed: unlike a due timer (cancelled via its own handle), a queued microtask has no handle
   * of its own to dispose, so this is the only way to keep it from running on a later checkpoint.
   */
  clear(): void {
    this._queue.length = 0;
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
  /** Once tombstones exceed this fraction of `_entries`, {@link DueHeap._compact} sweeps them out. */
  private static readonly COMPACTION_THRESHOLD = 0.5;
  private _entries: DueEntry<TDate>[] = [];
  private _nextSeq = 1;
  private _shouldRethrowTimerErrors: boolean;
  /**
   * The entries currently running their callback, innermost last - the only ones that have left
   * `_entries` without being disposed, and so the only ones {@link disposeAll} can't find there.
   * One per nesting level: a callback can re-enter {@link drainDue} by scheduling a timer or
   * advancing the clock, and each level has at most one entry in flight.
   */
  private _inFlight: DueEntry<TDate>[] = [];
  /**
   * One intrusive doubly-linked list per tag, letting {@link takeOutCallbacksByTag} retrieve entries
   * registered under a given tag directly, in registration order, without scanning every other
   * pending entry sharing this heap.
   */
  private _tagLists = new Map<unknown, { head: DueEntry<TDate>; tail: DueEntry<TDate> }>();
  /**
   * How many entries in `_entries` are tombstoned (soft-retired by {@link takeOutCallbacksByTag}, still
   * physically occupying an array slot) - see {@link _compact}.
   */
  private _deadCount = 0;
  constructor() {
    this._shouldRethrowTimerErrors = shouldRethrowTimerErrors();
  }

  /** The `runAt` of the earliest pending entry, or `undefined` if the queue is empty. */
  peekRunAt(): number | undefined {
    return this._entries.length > 0 ? this._entries[0].runAt : undefined;
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

  /**
   * Shared construction path for every registerX method on this class: builds a `kind` entry and
   * inserts it into the heap, additionally linked into `tag`'s own intrusive list - so
   * {@link takeOutCallbacksByTag} can retrieve it directly later - when `tag` isn't
   * `undefined`. {@link registerTimeout}/{@link registerInterval}/{@link registerRecurring} are
   * this with `tag: undefined`, not a kind of their own.
   */
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
    if (tag !== undefined) {
      entry.tag = tag;
      this._linkTag(entry, tag);
    }
    return entry;
  }

  /**
   * Extract (and removes) up to `maxCount` still-pending entries registered under `tag`, oldest first, returning
   * their callbacks. Each removal goes through the same `dispose()` every other cancellation path
   * uses (so an already-created `signal` gets aborted here too, exactly as it would for a normal
   * `once()` completing) - `dispose()` re-enters {@link retireEntry}, which is lazy: see its own
   * doc for why this doesn't pay an immediate `O(log heapSize)` removal per entry.
   */
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

  /**
   * Sweeps every tombstoned entry (see {@link retireEntry}) out of `_entries` in one linear pass,
   * then rebuilds the heap invariant bottom-up: Floyd's algorithm, reusing `_siftDown` on each
   * non-leaf index from the bottom up, builds a valid heap in `O(survivorCount)` overall - far
   * cheaper than the `O(log heapSize)` an individual removal would cost, paid once per batch of
   * tombstones instead of once per tombstone.
   */
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

  /**
   * Retires `entry` - called once per entry, from its own (idempotency-guarded) `dispose()`.
   * Unlinks it from its tag's list (if any) immediately, `O(1)`; if it's
   * still physically in the heap array, this doesn't remove it there and then (see
   * {@link takeOutCallbacksByTag}'s doc for why that's `O(log heapSize)` and worth deferring) - it's left as
   * a tombstone, counted toward the next {@link _compact}. `drainDue` also discards a tombstone it
   * reaches naturally on its own, so most near-term cancellations - the common case - end up
   * swept for free as a side effect of the clock simply advancing, without ever needing a compact.
   */
  retireEntry(entry: DueEntry<TDate>): void {
    if (entry.tag !== undefined) this._unlinkTag(entry);
    if (entry.heapIndex < 0) return;
    this._deadCount++;
    if (this._deadCount > this._entries.length * DueHeap.COMPACTION_THRESHOLD) this._compact();
  }

  /**
   * Disposes every live entry - heap-pending, or fired and still inside its own callback - and
   * empties the heap array. Detaches everything up front so each entry's own `dispose()` - which
   * reenters `retireEntry()` - finds nothing left to unlink rather than mutating the structures
   * this loop is walking. An entry cancelled through `clearTimer()` is left alone: it is already
   * logically gone, and was never disposed before this method stopped tracking it separately.
   */
  disposeAll(): void {
    const pending = this._entries;
    const inFlight = this._inFlight;
    for (const entry of pending) {
      entry.heapIndex = -1;
    }
    this._entries = [];
    this._inFlight = [];
    for (const entry of pending) {
      if (!entry.cancelled) entry.dispose();
    }
    for (const entry of inFlight) {
      entry.dispose();
    }
  }

  /** Appends `entry` at the end of the heap and sifts it up into place. */
  private _insert(entry: DueEntry<TDate>): void {
    const index = this._entries.length;
    this._entries.push(entry);
    this._siftUp(entry, index);
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
    const inFlight = this._inFlight;
    /* this call's own base of the in-flight stack - see the `finally` below */
    const inFlightDepth = inFlight.length;

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
            inFlight.push(root);
            if (rethrowTimersErrors) {
              root.callback();
            } else {
              try {
                root.callback();
              } catch (error) {
                console.error(error);
              }
            }
            inFlight.pop();
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

            inFlight.push(root);
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
            inFlight.pop();

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
      /* a callback that threw past its own pop, or a disposeAll() that emptied the stack under
         this call, both leave the stack at the wrong length - this is the one place that knows
         where this call's own entries start */
      if (inFlight.length > inFlightDepth) inFlight.length = inFlightDepth;
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

  //#region microtasks management
  /**
   * Narrows {@link BaseRuntime.microtasks}: a deterministic runtime's microtasks also expose
   * {@link IDeterministicMicrotasks.drain}.
   */
  override get microtasks(): IDeterministicMicrotasks {
    return this;
  }

  /**
   * Queues `callback` on this runtime's own microtask queue. See {@link IMicrotasks.queue}.
   */
  queue(callback: () => void): void {
    this.#microtasks.push(callback);
  }
  /**
   * Runs this runtime's pending microtasks. See {@link IDeterministicMicrotasks.drain}.
   *
   * A no-op when called while a checkpoint on this runtime is already draining - see
   * {@link MicrotaskQueue}.
   */
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
    const microtasks = this.#microtasks;
    /* advance() ends a task like any other call that may run due callbacks - see
       mayRunDueCallbacks - so its microtasks are owed up front, even if this walk finds nothing
       due at all. */
    if (microtasks.length !== 0) microtasks.runCheckpoint(this.#rethrowTimerErrors);
    this.#dueQueue.drainDueAdvancing(targetTimestamp, setCurrentTimestamp, microtasks);
  }

  /**
   * The due-heap is already this runtime's authoritative record of every outstanding timer, so
   * unlike the base class, tracking handles in a separate Set here would be pure duplication.
   * Also discards any still-queued microtasks: on a deterministic runtime they only ever run
   * through this runtime's own checkpoint, so once disposed they have no way left to run - unlike
   * a system runtime, where a queued microtask already lives on the host's own queue (see
   * {@link BaseSystemRuntime.queue}) and runs regardless of disposal.
   */
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

  specific(
    tag: unknown,
    kind: ScheduledHandleKind,
    initialDelay: IDurationSpec,
    callback: () => void,
    intervalDelay?: number,
  ): IScheduledHandle {
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
