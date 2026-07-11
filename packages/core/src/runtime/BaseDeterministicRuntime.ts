import type { SetTimeoutHandle } from "../scheduler/IScheduler.ts";
import { BaseRuntime } from "./BaseRuntime.ts";

/**
 * Base class for all deterministic runtime classes
 */
export abstract class BaseDeterministicRuntime<TDate> extends BaseRuntime<TDate> {
  /**
   * Map<timeoutHandleId, Map<timestampWhenToRun, callback>>
   */
  #timeoutCallbacksMap: Map<SetTimeoutHandle, Map<number, () => void>>;
  #nextTimeoutHandle: SetTimeoutHandle;

  constructor() {
    super();
    this.#nextTimeoutHandle = 1 as unknown as SetTimeoutHandle;
    this.#timeoutCallbacksMap = new Map<SetTimeoutHandle, Map<number, () => void>>();
  }

  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    const runAt = this.timestamp() + millisecondsDelay;

    this.#timeoutCallbacksMap.set(
      this.#nextTimeoutHandle,
      new Map<number, () => void>([[runAt, callback]]),
    );

    const returnValue =
      (this.#nextTimeoutHandle as unknown as number)++ as unknown as SetTimeoutHandle;
    this.mayRunTimeoutCallbacks(this.timestamp());
    return returnValue;
  }
  clearTimeout(handle: SetTimeoutHandle) {
    for (const [key, value] of this.#timeoutCallbacksMap) {
      if (key !== handle) {
        continue;
      }
      this.#timeoutCallbacksMap.delete(key);
      for (const [timestamp, _callback] of value) {
        value.delete(timestamp);
      }
    }
  }
  protected mayRunTimeoutCallbacks(nowTimestamp: number): void {
    for (const [_key, value] of this.#timeoutCallbacksMap) {
      for (const [timestamp, callback] of value) {
        if (timestamp <= nowTimestamp) {
          value.delete(timestamp);
          callback();
        }
      }
    }
  }

  protected timestamp(): number {
    const timestampValue = this.timestampImpl();
    //this.mayRunTimeoutCallbacks(timestampValue);
    return timestampValue;
  }

  protected abstract timestampImpl(): number;

  localNow(): TDate {
    const timestampValue = this.timestampImpl();
    //this.mayRunTimeoutCallbacks(timestampValue);
    return this.localNowImpl(timestampValue);
  }
  utcNow(): TDate {
    const timestampValue = this.timestampImpl();
    //this.mayRunTimeoutCallbacks(timestampValue);
    return this.utcNowImpl(timestampValue);
  }
  protected abstract localNowImpl(nowTimestamp: number): TDate;
  protected abstract utcNowImpl(nowTimestamp: number): TDate;
}
