import { SystemPerformance } from "../performance/system-performance.ts";
import type { DueHandle, ITimeConverter, TimerKind, TimezoneDefinition } from "../types/types.ts";
import { TIMER_KIND_INTERVAL, TIMER_KIND_RECURRING, TIMER_KIND_TIMEOUT } from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/**
 * Wraps a native timer handle to carry a {@link TimerKind}. For TIMER_KIND_RECURRING, `current`
 * is reassigned on every rearm (there's no single native handle spanning the whole schedule,
 * unlike a native `setInterval`) - `cancelled` is what a consumer's handle reference actually
 * stays valid against across those rearms.
 */
class SystemDueHandle implements DueHandle {
  readonly kind: TimerKind;
  current: ReturnType<typeof setTimeout> | undefined;
  cancelled = false;
  constructor(kind: TimerKind, current?: ReturnType<typeof setTimeout>) {
    this.kind = kind;
    this.current = current;
  }
}

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  /**
   * @param localTimezone the local timezone this runtime is configured with.
   * @param converter the time converter for this runtime's date library, provided by the concrete subclass.
   */
  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter, new SystemPerformance());
  }

  /**
   * Schedules `callback` via the native `setTimeout`.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 0) {
      millisecondsDelay = 0;
    }
    return new SystemDueHandle(TIMER_KIND_TIMEOUT, setTimeout(callback, millisecondsDelay));
  }
  /**
   * Cancels a pending timeout via the native `clearTimeout`.
   */
  clearTimeout(handle: DueHandle): void {
    const h = handle as SystemDueHandle | undefined;
    if (h?.kind === TIMER_KIND_TIMEOUT && h.current !== undefined) {
      clearTimeout(h.current);
      h.current = undefined;
    }
  }
  /**
   * Schedules `callback` via the native `setInterval`.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 1) {
      millisecondsDelay = 1;
    }
    return new SystemDueHandle(TIMER_KIND_INTERVAL, setInterval(callback, millisecondsDelay));
  }
  /**
   * Cancels a pending interval via the native `clearInterval`.
   */
  clearInterval(handle: DueHandle): void {
    const h = handle as SystemDueHandle | undefined;
    if (h?.kind === TIMER_KIND_INTERVAL && h.current !== undefined) {
      clearInterval(h.current);
      h.current = undefined;
    }
  }
  /**
   * Schedules `callback` to run once, `initialDelay` from now, then again via a self-rearming
   * chain of native `setTimeout` calls, each delay coming from `callback`'s own return value -
   * typically computed from state the run itself just updated (e.g. a counter). Returning `false`
   * stops the schedule, with no extra trailing run: there's never a next occurrence already
   * committed by the time it's decided, unlike clearTimeout/clearInterval/clearRecurring, which
   * can only ever be forward-looking since they race an already-scheduled callback.
   */
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle {
    const handle = new SystemDueHandle(TIMER_KIND_RECURRING);
    const arm = (delayMs: number): void => {
      handle.current = setTimeout(() => {
        const next = callback();
        if (!handle.cancelled && next !== false) {
          arm(next < 0 ? 0 : next);
        }
      }, delayMs);
    };
    if (initialDelay === undefined || initialDelay < 0) {
      initialDelay = 0;
    }
    arm(initialDelay);
    return handle;
  }
  /**
   * Cancels a pending recurring schedule started via {@link setRecurring}. A no-op if it already
   * stopped (`callback` returned `false`) or was already cleared.
   */
  clearRecurring(handle: DueHandle): void {
    const h = handle as SystemDueHandle | undefined;
    if (h?.kind !== TIMER_KIND_RECURRING) {
      return;
    }
    h.cancelled = true;
    clearTimeout(h.current);
    h.current = undefined;
  }
  /**
   * Queues `callback` via the native `queueMicrotask`, onto the host's own microtask queue.
   */
  queueMicrotask(callback: () => void): void {
    queueMicrotask(callback);
  }
}
