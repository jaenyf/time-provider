import type { IScheduler, SetTimeoutHandle } from "./IScheduler.ts";

export class DeterministicScheduler implements IScheduler {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle {
    throw new Error("Method not implemented.");
  }
}
