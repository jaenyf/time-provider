import {
  type IDeterministicRuntime,
  type IDeterministicMicrotasks,
  type EpochMilliseconds,
  type MonotonicMilliseconds,
  type IDeterministicScheduler,
  type IDeterministicTimers,
  type IDurationSpec,
  toDuration,
  type DurationMilliseconds,
} from "../../deterministic.ts";
import { shouldRethrowTimerErrors } from "../../environment.ts";
import { DeterministicTimings } from "../../timings/deterministic-timings.ts";
import type {
  TimezoneDefinition,
  ITimeConverter,
  ITimings,
  IScheduledHandle,
  ITimerOptions,
  ScheduledHandleKind,
} from "../../types/types.ts";
import type { DueEntry } from "./DueEntry.ts";
import { DueHeap } from "./DueHeap.ts";
import { MicrotaskQueue } from "./MicrotaskQueue.ts";
import { MicrotasksFacade } from "./MicrotasksFacade.ts";
import { BaseRuntime } from "../runtime-base.ts";

/** Base class for deterministic runtimes. */

export abstract class BaseDeterministicRuntime<TDate>
  extends BaseRuntime<TDate>
  implements IDeterministicRuntime<TDate>
{
  #dueQueue: DueHeap<TDate>;
  #dueDrainingDisabled = false;
  #microtasks: MicrotaskQueue;
  #microtasksFacade?: IDeterministicMicrotasks;
  #rethrowTimerErrors: boolean;
  #timings = new DeterministicTimings(this);
  #monotonicOrigin!: EpochMilliseconds;
  #wallClockTimeOffset = 0;

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
    return (this.#dueTimestampNow() - this.#monotonicOrigin) as MonotonicMilliseconds;
  }

  get monotonicOrigin(): EpochMilliseconds {
    return this.#monotonicOrigin;
  }

  #dueTimestampNow(): number {
    return this.timestampNow() - this.#wallClockTimeOffset;
  }

  /** Moves the wall clock by `delta` without moving monotonic time. */
  protected snapWallClockTime(delta: number): void {
    this.#wallClockTimeOffset += delta;
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

  /** Number of callbacks running, nested. */
  protected get callbackDepth(): number {
    return this.#dueQueue.drainDepth;
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

  override get timers(): IDeterministicTimers {
    return this;
  }

  get nextDueTime(): EpochMilliseconds | undefined {
    const runAt = this.#dueQueue.firstUntaggedRunAt();
    return this.#toWallTime(runAt === Infinity ? undefined : runAt);
  }

  get lastDueTime(): EpochMilliseconds | undefined {
    return this.#toWallTime(this.#dueQueue.lastUntaggedRunAt());
  }

  get pendingCount(): number {
    return this.#dueQueue.untaggedCount;
  }

  /** Number of untagged timers due at or before the wall time `time`. */
  protected countTimersDueBy(time: number): number {
    return this.#dueQueue.countUntaggedDueBy(time - this.#wallClockTimeOffset);
  }

  #toWallTime(runAt: number | undefined): EpochMilliseconds | undefined {
    return runAt === undefined
      ? undefined
      : ((runAt + this.#wallClockTimeOffset) as EpochMilliseconds);
  }

  //#region microtasks management
  override get microtasks(): IDeterministicMicrotasks {
    return (this.#microtasksFacade ??= new MicrotasksFacade(this, this.#microtasks));
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
  /**
   * Runs the callbacks due now.
   * @param coalesce Fires each overdue timer once; see {@link DueHeap.drainDue}.
   */
  protected mayRunDueCallbacks(coalesce = false): void {
    if (this.#dueQueue.drainDepth !== 0) return;
    this.#drain(this.#dueTimestampNow(), coalesce);
  }

  #drain(dueNow: number, coalesce = false): void {
    const microtasks = this.#microtasks;
    /* the call that got us here ends a task, so its microtasks are owed before any timer runs */
    if (microtasks.length !== 0) microtasks.runCheckpoint(this.#rethrowTimerErrors);
    if (this.#dueDrainingDisabled) return;
    const nextRunAt = this.#dueQueue.peekRunAt();
    if (nextRunAt === undefined || nextRunAt > dueNow) return;
    this.#dueQueue.drainDue(dueNow, microtasks, coalesce);
  }

  /** Drains after a registration, unless a running drain will pick the new entry up. */
  #drainIfIdle(now: number): void {
    if (
      (this.#microtasks.length !== 0 || this.#dueQueue.hasDueBy(now)) &&
      this.#dueQueue.drainDepth === 0
    )
      this.#drain(now);
  }

  /** Drains due entries while advancing the wall clock. */
  protected drainDueAdvancing(
    targetTimestamp: number,
    setCurrentTimestamp: (timestamp: number) => void,
  ): void {
    const microtasks = this.#microtasks;
    /* A move ends a task like any other call that may run due callbacks - see
       mayRunDueCallbacks - so its microtasks are owed up front, even if this walk finds nothing
       due at all. */
    if (microtasks.length !== 0) microtasks.runCheckpoint(this.#rethrowTimerErrors);
    const offset = this.#wallClockTimeOffset;
    this.#dueQueue.drainDue(
      targetTimestamp - offset,
      microtasks,
      false,
      offset === 0 ? setCurrentTimestamp : (runAt) => setCurrentTimestamp(runAt + offset),
    );
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
    if (entry.owner === this.#dueQueue) entry.dispose();
  }

  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    const msDelay = Math.max(toDuration(delay), 0);
    const now = this.#dueTimestampNow();
    const entry = this.#dueQueue.registerTimeout(now + msDelay, callback);
    this.#drainIfIdle(now);
    if (options?.signal) BaseRuntime.ensureTimerDisposalOnAbort(entry, options);
    return entry;
  }

  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): IScheduledHandle {
    this.assertIsNotDisposed();
    const msDelay = Math.max(toDuration(delay), 0);
    const now = this.#dueTimestampNow();
    const entry = this.#dueQueue.registerInterval(now + msDelay, msDelay, callback);
    this.#drainIfIdle(now);
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
    const now = this.#dueTimestampNow();
    const entry = this.#dueQueue.registerRecurring(now + msInitialDelay, callback);
    this.#drainIfIdle(now);
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
    const now = this.#dueTimestampNow();
    const entry = this.#dueQueue.registerSpecific(
      tag,
      kind,
      now + msDelay,
      intervalDelay ?? 0,
      callback,
    );
    this.#drainIfIdle(now);
    return entry;
  }

  takeOutSpecificCallbacks(tag: unknown, maxCount: number): (() => void)[] {
    return this.#dueQueue.takeOutCallbacksByTag(tag, maxCount);
  }

  countSpecific(tag: unknown): number {
    return this.#dueQueue.countTagged(tag);
  }
}
