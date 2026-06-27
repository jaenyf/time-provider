import { type Adapter } from "@time-provider/core";
import moment from "moment";

export class FixedTimeAdapter implements Adapter<moment.Moment> {
  #referenceDate: moment.Moment;
  constructor(referenceDate: string | number | moment.Moment) {
    this.#referenceDate = moment(referenceDate);
  }

  localNow = () => {
    return this.#referenceDate;
  };
  utcNow = () => {
    return this.#referenceDate;
  };
  parse = (_input: string | number | moment.Moment) => {
    return this.#referenceDate;
  };
}
