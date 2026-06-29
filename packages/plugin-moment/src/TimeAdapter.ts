import moment from "moment";
import { BaseTimeAdapter } from "@time-provider/core";

export class TimeAdapter extends BaseTimeAdapter<moment.Moment> {
  localNow(): moment.Moment {
    return moment();
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
  parse(initialValue: string | number | moment.Moment): moment.Moment {
    return moment(initialValue);
  }
}
