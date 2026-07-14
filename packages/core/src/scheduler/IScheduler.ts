export type SetTimeoutHandle = ReturnType<typeof setTimeout>;
export type SetIntervalHandle = ReturnType<typeof setInterval>;
export interface IScheduler {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle;
  clearTimeout(handle: SetTimeoutHandle): void;
  setInterval(millisecondsDelay: number, callback: () => void): SetIntervalHandle;
  clearInterval(handle: SetIntervalHandle): void;
}
