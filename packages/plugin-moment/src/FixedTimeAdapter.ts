import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import moment, { type Moment } from "moment";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Moment> {
  constructor(time: string | number | moment.Moment) {
    super(time);
  }
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return moment(time);
  }
}
