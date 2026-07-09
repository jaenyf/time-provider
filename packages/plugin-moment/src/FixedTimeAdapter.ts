import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import moment, { type Moment } from "moment";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Moment> {
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return moment(time);
  }
}
