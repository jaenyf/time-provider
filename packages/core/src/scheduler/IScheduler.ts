export type SetTimeoutHandle = number;
export interface IScheduler {
  setTimeout(millisecondsDelay: number, callback: () => void): SetTimeoutHandle;
}
