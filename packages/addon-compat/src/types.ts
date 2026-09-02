//#region Timers
// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

import type { IScheduledHandle } from "@time-provider/core";

/**
 * Schedules and cancels timeouts/intervals.
 *
 * Execution model depends on the clock strategy backing these timers:
 * - On a **system** clock, callbacks run asynchronously via the real, native
 *   timers, exactly like in production code.
 * - On a **manual** or **sequential** clock, callbacks run synchronously,
 *   in-line, as soon as they become due - as a direct side effect of
 *   {@link ITimers.setTimeout}/{@link ITimers.setInterval} itself
 *   (e.g. a delay of `0` or a negative value is already due when scheduled),
 *   or of any call that moves the clock forward (`advance()`,
 *   `clock.localNow()`, `clock.utcNow()`). There is no event loop tick
 *   involved: a due callback has already run by the time the triggering call
 *   returns.
 * - On a **fixed** clock, time never advances, so no timer callback is
 *   ever due - it never runs, regardless of the delay it was registered with.
 *
 * On a manual/sequential clock, a callback that throws is handled to match what a native timer
 * callback throwing would actually do in the current environment: the error propagates out of the
 * triggering call in a Node-like environment, and is logged via `console.error` and swallowed in a
 * browser-like one.
 */
export interface ITimers {
  /**
   * Schedules `callback` to run once, `millisecondsDelay` milliseconds from
   * now (0 if omitted or negative).
   *
   * When it runs depends on the clock strategy: asynchronously via real native timers on a system
   * clock, synchronously and in-line the moment it becomes due on a manual/sequential clock, and
   * never on a fixed clock (time never advances there). See {@link ITimers} for the full model.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): IScheduledHandle;
  /**
   * Cancels a pending timeout scheduled via {@link ITimers.setTimeout}.
   * A no-op if it already ran or was already cleared.
   */
  clearTimeout(handle: IScheduledHandle): void;
  /**
   * Schedules `callback` to run repeatedly, every `millisecondsDelay`
   * milliseconds (0 if omitted or negative). No interval ever repeats faster
   * than once per millisecond: a system one clamps `millisecondsDelay` to 1
   * up front, and a deterministic one accepts 0 - firing immediately, since
   * it is already due - then re-arms every 1 millisecond, matching what a
   * native interval does with a delay of 0.
   *
   * When each run happens depends on the clock strategy: asynchronously via real native timers on
   * a system clock, synchronously and in-line as each run becomes due on a manual/sequential clock
   * (so an interval whose delay is shorter than an `advance()` re-fires as many times as fit), and
   * never on a fixed clock. See {@link ITimers} for the full model.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): IScheduledHandle;
  /**
   * Cancels a pending interval scheduled via {@link ITimers.setInterval}.
   * A no-op if it was already cleared.
   */
  clearInterval(handle: IScheduledHandle): void;
  /**
   * Schedules `callback` to run once, `initialDelay` milliseconds from now (0 if omitted or
   * negative), then again after whatever delay `callback` itself returns - typically computed
   * from state the run itself just updated (a counter, remaining time, ...). Return `false` to
   * stop recurring; any other falsy value (e.g. `0`) still schedules a run - `0` milliseconds
   * from the previous one on a system clock, and `1` on a deterministic one, which never re-arms
   * faster than once per millisecond.
   *
   * When each run happens depends on the clock strategy, exactly as for
   * {@link ITimers.setTimeout}: asynchronously via real native timers on a system clock,
   * synchronously and in-line as each run becomes due on a manual/sequential clock, and never on a
   * fixed clock. See {@link ITimers} for the full model.
   */
  setRecurring(callback: () => number | false, initialDelay?: number): IScheduledHandle;
  /**
   * Cancels a pending recurring schedule started via {@link ITimers.setRecurring}. A no-op if
   * it already stopped (`callback` returned `false`) or was already cleared.
   */
  clearRecurring(handle: IScheduledHandle): void;
}

interface ITimersProvider {
  /**
   * Get the current configured timers
   */
  get timers(): ITimers;
}

//#endregion

/**
 * The shape this addon adds to a composed Time-Provider: a `compat` property exposing
 * {@link ICompatApi}.
 */
export type WithCompatApi<TDate> = {
  /**
   * Provides low-level styles signatures methods - see {@link ICompatApi}.
   */
  compat: ICompatApi<TDate>;
};

/**
 * The compat API facade this addon adds to a composed Time-Provider, reachable as
 * `timeProvider.compat` once composed via `createTimeProvider.for(plugin).use(thisAddon)`. Doesn't
 * extend `IAddon<TDate>` (unlike the underlying `CompatRuntime`): the facade actually reachable at
 * `.compat` deliberately drops the addon's own lifecycle members (`.runtime`, `.applyToRuntime`,
 * `.dispose`, `.isDisposed`) - a consumer has no business calling those - so the type shouldn't
 * promise them either.
 */
// Kept generic over TDate for symmetry with WithCompatApi<TDate>, even though no member here
// happens to reference it.
// oxlint-disable-next-line no-unused-vars
export interface ICompatApi<TDate> extends ITimersProvider {}
