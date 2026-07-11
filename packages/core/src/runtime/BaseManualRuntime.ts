import type { IAdvanceConfiguration, IManualRuntime } from "./IManualRuntime.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/**
 * Base class for a deterministically manual runtime
 */
export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  constructor(fixedTime: string | number | TDate) {
    super([fixedTime]);
  }

  protected setDeterminedTime(time: TDate) {
    this._sequentialTimestamps[0] = this.convertToTimestampImpl(time);
  }

  advance(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate> {
    const returnValue = this.advanceImpl(advanceConfiguration);
    this.mayRunTimeoutCallbacks(this.timestamp());
    return returnValue;
  }

  abstract advanceImpl(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate>;
}
