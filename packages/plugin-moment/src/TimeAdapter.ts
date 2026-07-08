import moment from "moment";
import { BaseTimeAdapter } from "@time-provider/core";

export class TimeAdapter extends BaseTimeAdapter<moment.Moment> {
  localNow(): moment.Moment {
    return moment();
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
  protected convertToDateImpl(time: string | number | moment.Moment): moment.Moment {
    return moment(time);
  }
}
