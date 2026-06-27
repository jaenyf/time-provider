import { type Adapter } from "@time-provider/core";
import type { Temporal } from "@js-temporal/polyfill";
import { TimeAdapter } from "./TimeAdapter.ts";

export class FixedTimeAdapter implements Adapter<Temporal.Instant> {
  #referenceDate: Temporal.Instant;
  constructor(referenceDate: string | number | Temporal.Instant) {
    this.#referenceDate = new TimeAdapter().parse(referenceDate);
  }

  localNow = () => {
    return this.#referenceDate;
  };
  utcNow = () => {
    return this.#referenceDate;
  };
  parse = (_input: string | number | Temporal.Instant) => {
    return this.#referenceDate;
  };
}
