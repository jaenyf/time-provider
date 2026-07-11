import { BaseDeterministicRuntime } from "./BaseDeterministicRuntime.ts";

/**
 * Base class for a deterministically sequential runtime
 */
export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  protected _sequentialTimestamps: number[];
  #suspendTimeShift: boolean;
  constructor(sequentialTimes: (string | number | TDate)[]) {
    super();
    this.#suspendTimeShift = true;
    this._sequentialTimestamps = sequentialTimes.map((t) => this.convertToTimestampImpl(t));
    this.#suspendTimeShift = false;
  }

  timestampImpl() {
    this.#suspendTimeShift = true;
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    this.#suspendTimeShift = false;
    return nowTimestamp;
  }
  localNowImpl() {
    this.#suspendTimeShift = true;
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    const value = this.convertToDateImpl(nowTimestamp);
    this.#suspendTimeShift = false;
    this.getNextSequentialTimestamp();
    return value;
  }
  utcNowImpl() {
    this.#suspendTimeShift = true;
    const nowTimestamp = this.getNextSequentialTimestamp();
    this.mayRunTimeoutCallbacks(nowTimestamp);
    const value = this.convertToDateImpl(nowTimestamp);
    this.#suspendTimeShift = false;
    this.getNextSequentialTimestamp();
    return value;
  }

  private getNextSequentialTimestamp(): number {
    if (this.#suspendTimeShift) {
      return this._sequentialTimestamps.length > 0 ? this._sequentialTimestamps[0] : 0;
    }

    return this._sequentialTimestamps.length > 1
      ? (this._sequentialTimestamps.shift() as number)
      : this._sequentialTimestamps.length > 0
        ? this._sequentialTimestamps[0]
        : 0;
  }
}
