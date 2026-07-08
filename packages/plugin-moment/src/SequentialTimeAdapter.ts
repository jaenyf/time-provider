import { BaseSequentialTimeAdapter } from "@time-provider/core";
import moment, { type Moment } from "moment";

export class SequentialTimeAdapter extends BaseSequentialTimeAdapter<Moment> {
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return moment(time);
  }
}
