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
  #nextTimeoutHandle: SetTimeoutHandle;
  #intervalCallbacksMap: Map<SetIntervalHandle, IntervalEntry>;
  #nextIntervalHandle: SetIntervalHandle;

  constructor() {
    super();
    this.#nextTimeoutHandle = 1 as unknown as SetTimeoutHandle;
    this.#timeoutCallbacksMap = new Map<SetTimeoutHandle, TimeoutEntry>();
    this.#nextIntervalHandle = 1 as unknown as SetIntervalHandle;
    this.#intervalCallbacksMap = new Map<SetIntervalHandle, IntervalEntry>();
  }

  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay);

    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    this.#timeoutCallbacksMap.set(this.#nextTimeoutHandle, { runAt, callback });

    const returnValue = this.#nextTimeoutHandle;

    this.#nextTimeoutHandle = ((this.#nextTimeoutHandle as unknown as number) +
      1) as unknown as SetTimeoutHandle;
    this.mayRunTimeoutCallbacks(now);
    return returnValue;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    this.#timeoutCallbacksMap.delete(handle);
  }
  protected mayRunTimeoutCallbacks(nowTimestamp: number): void {
    const handlesToClear: SetTimeoutHandle[] = [];
    const callbacksToRun: (() => void)[] = [];

    for (const [handle, entry] of this.#timeoutCallbacksMap) {
      if (entry.runAt <= nowTimestamp) {
        handlesToClear.push(handle);
        callbacksToRun.push(entry.callback);
      }
    }

    for (const handle of handlesToClear) {
      this.clearTimeout(handle);
    }
    for (const callback of callbacksToRun) {
      callback();
    }
  }

  setInterval(millisecondsDelay: number, callback: () => void): SetIntervalHandle {
    millisecondsDelay = Math.max(0, millisecondsDelay);
    const now = this.timestamp();
    const runAt = now + millisecondsDelay;
    this.#intervalCallbacksMap.set(this.#nextIntervalHandle, {
      runAt: runAt,
      delay: millisecondsDelay,
      callback: callback,
    });
    const returnValue = this.#nextIntervalHandle;

    this.#nextIntervalHandle = ((this.#nextIntervalHandle as unknown as number) +
      1) as unknown as SetIntervalHandle;
    this.mayRunIntervalCallbacks(now);
    return returnValue;
  }
  clearInterval(handle: SetIntervalHandle) {
    this.#intervalCallbacksMap.delete(handle);
  }
  protected mayRunIntervalCallbacks(nowTimestamp: number): void {
    for (const [_handle, entry] of this.#intervalCallbacksMap) {
      while (entry.runAt <= nowTimestamp) {
        entry.callback();
        entry.runAt += entry.delay ? entry.delay : 1;
      }
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
