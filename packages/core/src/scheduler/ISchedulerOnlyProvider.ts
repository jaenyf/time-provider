import type { IScheduler } from "./IScheduler.ts";

export interface ISchedulerOnlyProvider {
  /**
   * Get the current configured scheduler
   */
  get scheduler(): IScheduler;
}
