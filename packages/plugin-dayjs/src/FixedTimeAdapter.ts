import { type Adapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";

export class FixedTimeAdapter implements Adapter<Dayjs> {
  #referenceDate: Dayjs;
  constructor(referenceDate: string | number | Dayjs) {
    this.#referenceDate = dayjs(referenceDate);
  }

  localNow = () => {
    return this.#referenceDate;
  };
  utcNow = () => {
    return this.#referenceDate;
  };
  parse = (_input: string | number | Dayjs) => {
    return this.#referenceDate;
  };
}
