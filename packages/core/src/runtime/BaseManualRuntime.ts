import type { IManualRuntime } from "./IManualRuntime.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";
import type { IAdvanceConfiguration, IManualClock } from "../clock/IManualClock.ts";

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

  get clock(): IManualClock<TDate> {
    return this;
  }

  advance(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate> {
    const returnValue = this.advanceImpl(advanceConfiguration);
    this.mayRunTimeoutCallbacks(this.timestamp());
    this.mayRunIntervalCallbacks(this.timestamp());
    return returnValue;
  }

  abstract advanceImpl(advanceConfiguration: IAdvanceConfiguration): IManualRuntime<TDate>;
}
