import type { IManualRuntime } from "./runtime/IManualRuntime.ts";
import type { IRuntime } from "./runtime/IRuntime.ts";

export interface IPlugin<TDate> {
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(): IRuntime<TDate>;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(initialTime: string | number | TDate): IManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(initialTime: string | number | TDate): IRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler
   */
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IRuntime<TDate>;
}
