import { SystemPerformance } from "../performance/system-performance.ts";
import type {
  AnimationFrameHandle,
  ITimeConverter,
  SetIntervalHandle,
  SetTimeoutHandle,
  TimezoneDefinition,
} from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/**
 * Base class for a system runtime
 */
export abstract class BaseSystemRuntime<TDate> extends BaseRuntime<TDate> {
  constructor(localTimezone: TimezoneDefinition, converter: ITimeConverter<TDate>) {
    super(localTimezone, converter, new SystemPerformance());
  }

  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 0) {
      millisecondsDelay = 0;
    }
    return setTimeout(callback, millisecondsDelay);
  }
  clearTimeout(handle: SetTimeoutHandle): void {
    return clearTimeout(handle);
  }
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle {
    if (millisecondsDelay === undefined || millisecondsDelay < 1) {
      millisecondsDelay = 1;
    }
    return setInterval(callback, millisecondsDelay);
  }
  clearInterval(handle: SetIntervalHandle): void {
    return clearInterval(handle);
  }
  private throwAnimationFrameApiNotSupported(): AnimationFrameHandle {
    throw new Error("Environment does not support Animation frame API (are you in a browser?)");
  }
  requestAnimationFrame(callback: () => void): AnimationFrameHandle {
    if (typeof requestAnimationFrame === "function") {
      return requestAnimationFrame(callback);
    }
    return this.throwAnimationFrameApiNotSupported();
  }
  cancelAnimationFrame(handle: AnimationFrameHandle): void {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(handle);
      return;
    }
    this.throwAnimationFrameApiNotSupported();
  }
}
