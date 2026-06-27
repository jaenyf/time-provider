import { type Adapter } from "@time-provider/core";
import { DateTime } from "luxon";
import { TimeAdapter } from "./TimeAdapter.ts";

export class FixedTimeAdapter implements Adapter<DateTime> {
  #referenceDate: DateTime;
  constructor(referenceDate: string | number | DateTime) {
    this.#referenceDate = new TimeAdapter().parse(referenceDate);
  }

  localNow = () => {
    return this.#referenceDate;
  };
  utcNow = () => {
    return this.#referenceDate;
  };
  parse = (_input: string | number | DateTime) => {
    return this.#referenceDate;
  };
}
