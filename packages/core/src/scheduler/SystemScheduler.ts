import type { IScheduler, SetTimeoutHandle } from "./IScheduler.ts";

export class SystemScheduler implements IScheduler {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    return setTimeout(callback, millisecondsDelay) as unknown as SetTimeoutHandle;
  }
}
