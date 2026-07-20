import type { IScheduler } from "./IScheduler.ts";

export interface ISchedulerProvider {
  /**
   * Get the current configured scheduler
   */
  get scheduler(): IScheduler;
}
