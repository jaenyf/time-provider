export type SetTimeoutHandle = ReturnType<typeof setTimeout>;
export type SetIntervalHandle = ReturnType<typeof setInterval>;

/**
 * Schedules and cancels timeouts/intervals.
 *
 * Execution model depends on the clock strategy backing this scheduler:
 * - On a **system** clock, callbacks run asynchronously via the real, native
 *   timers, exactly like in production code.
 * - On a **manual** or **sequential** clock, callbacks run synchronously,
 *   in-line, as soon as they become due - as a direct side effect of
 *   {@link IScheduler.setTimeout}/{@link IScheduler.setInterval} itself
 *   (e.g. a delay of `0` or a negative value is already due when scheduled),
 *   or of any call that moves the clock forward (`advance()`,
 *   `clock.localNow()`, `clock.utcNow()`). There is no event loop tick
 *   involved: a due callback has already run by the time the triggering call
 *   returns.
 * - On a **fixed** clock, time never advances, so no scheduled callback is
 *   ever due - it never runs, regardless of the delay it was registered with.
 */
export interface IScheduler {
  /**
   * Schedules `callback` to run once, `millisecondsDelay` milliseconds from
   * now (0 if omitted or negative). See {@link IScheduler} for when the
   * callback actually runs depending on the clock strategy.
   */
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  /**
   * Cancels a pending timeout scheduled via {@link IScheduler.setTimeout}.
   * A no-op if it already ran or was already cleared.
   */
  clearTimeout(handle: SetTimeoutHandle): void;
  /**
   * Schedules `callback` to run repeatedly, every `millisecondsDelay`
   * milliseconds (0 if omitted or negative). See {@link IScheduler} for when
   * each run actually happens depending on the clock strategy.
   */
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  /**
   * Cancels a pending interval scheduled via {@link IScheduler.setInterval}.
   * A no-op if it was already cleared.
   */
  clearInterval(handle: SetIntervalHandle): void;
}
