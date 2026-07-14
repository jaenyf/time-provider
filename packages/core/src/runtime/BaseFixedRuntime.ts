import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/**
 * Base class for a deterministically fixed runtime
 */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  constructor(fixedTime: string | number | TDate) {
    super([fixedTime]);
  }
}
