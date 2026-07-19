import type { SetIntervalHandle, SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import { BaseRuntime } from "./BaseRuntime.ts";

type TimeoutEntry = {
  runAt: number;
  callback: () => void;
};

type IntervalEntry = {
  runAt: number;
  delay: number;
  callback: () => void;
};

/**
 * Base class for all deterministic runtime classes
 */
export abstract class BaseDeterministicRuntime<TDate> extends BaseRuntime<TDate> {
  #timeoutCallbacksMap: Map<SetTimeoutHandle, TimeoutEntry>;
  #nextTimeoutHandleValue: number;
  #intervalCallbacksMap: Map<SetIntervalHandle, IntervalEntry>;
  #nextIntervalHandleValue: number;

  constructor() {
    super();
    this.#nextTimeoutHandleValue = 1;
    this.#timeoutCallbacksMap = new Map<SetTimeoutHandle, TimeoutEntry>();
    this.#nextIntervalHandleValue = 1;
    this.#intervalCallbacksMap = new Map<SetIntervalHandle, IntervalEntry>();
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);

    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const handle = this.#nextTimeoutHandleValue as unknown as SetTimeoutHandle;
    this.#timeoutCallbacksMap.set(handle, { runAt, callback });
    this.#nextTimeoutHandleValue += 1;
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly become due
    this.mayRunTimeoutCallbacks(now, handle);
    return handle;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    this.#timeoutCallbacksMap.delete(handle);
  }
  protected mayRunTimeoutCallbacks(nowTimestamp: number, onlyHandle?: SetTimeoutHandle): void {
    const handlesToClear: SetTimeoutHandle[] = [];
    const callbacksToRun: (() => void)[] = [];

    if (onlyHandle !== undefined) {
      const entry = this.#timeoutCallbacksMap.get(onlyHandle);
      if (entry !== undefined && entry.runAt <= nowTimestamp) {
        handlesToClear.push(onlyHandle);
        callbacksToRun.push(entry.callback);
      }
    } else {
      for (const [handle, entry] of this.#timeoutCallbacksMap) {
        if (entry.runAt <= nowTimestamp) {
          handlesToClear.push(handle);
          callbacksToRun.push(entry.callback);
        }
      }
    }

    for (const handle of handlesToClear) {
      this.clearTimeout(handle);
    }
    for (const callback of callbacksToRun) {
      callback();
    }
  }

  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay !== undefined ? millisecondsDelay : 0);
    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    const handle = this.#nextIntervalHandleValue as unknown as SetIntervalHandle;
    this.#intervalCallbacksMap.set(handle, {
      runAt: runAt,
      delay: millisecondsDelay,
      callback: callback,
    });
    this.#nextIntervalHandleValue += 1;
    // `now` can't have moved since any earlier call, so nothing already in the map can have newly become due
    this.mayRunIntervalCallbacks(now, handle);
    return handle;
  }
  clearInterval(handle: SetIntervalHandle) {
    this.#intervalCallbacksMap.delete(handle);
  }
  protected mayRunIntervalCallbacks(nowTimestamp: number, onlyHandle?: SetIntervalHandle): void {
    if (onlyHandle !== undefined) {
      /*
       * `onlyHandle` is only ever passed here by setInterval(), synchronously right after that same handle was inserted.
       * Nothing can have removed it yet, so we can safely assume it's always present.
       */
      const entry = this.#intervalCallbacksMap.get(onlyHandle)!;
      this.#fireDueIntervalEntry(entry, nowTimestamp);

      return;
    }
    for (const entry of this.#intervalCallbacksMap.values()) {
      this.#fireDueIntervalEntry(entry, nowTimestamp);
    }
  }

  #fireDueIntervalEntry(entry: IntervalEntry, nowTimestamp: number): void {
    while (entry.runAt <= nowTimestamp) {
      entry.callback();
      /*
        Real environments (Node, browsers) clamp an interval delay below 1ms
        up to 1ms - a 0ms interval still fires roughly once per millisecond,
        not "as fast as infinitely possible". Falling back to 1 here mirrors
        that: a live interval genuinely re-fires proportionally to elapsed
        time when advance()-d far into the future, matching what it would
        do in a real environment.
      */
      entry.runAt += entry.delay ? entry.delay : 1;
    }
  }

  protected timestamp(): number {
    return this.timestampImpl();
  }

  protected abstract timestampImpl(): number;

  localNow(): TDate {
    const timestampValue = this.timestampImpl();
    return this.localNowImpl(timestampValue);
  }
  utcNow(): TDate {
    const timestampValue = this.timestampImpl();
    return this.utcNowImpl(timestampValue);
  }
  protected abstract localNowImpl(nowTimestamp: number): TDate;
  protected abstract utcNowImpl(nowTimestamp: number): TDate;
}
