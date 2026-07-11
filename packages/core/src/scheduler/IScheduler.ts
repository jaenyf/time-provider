export type SetTimeoutHandle = ReturnType<typeof setTimeout>;
export interface IScheduler {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle;
  clearTimeout(handle: SetTimeoutHandle): void;
}
