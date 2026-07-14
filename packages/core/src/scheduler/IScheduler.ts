export type SetTimeoutHandle = ReturnType<typeof setTimeout>;
export type SetIntervalHandle = ReturnType<typeof setInterval>;
export interface IScheduler {
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  clearTimeout(handle: SetTimeoutHandle): void;
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  clearInterval(handle: SetIntervalHandle): void;
}
