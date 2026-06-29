import { BaseFixedTimeAdapter } from "@time-provider/core";
import moment from "moment";

export class FixedTimeAdapter extends BaseFixedTimeAdapter<moment.Moment> {
  createFixedTime(fixedDate: string | number | moment.Moment): moment.Moment {
    return moment(fixedDate);
  }
}
