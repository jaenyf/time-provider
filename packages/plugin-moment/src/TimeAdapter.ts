import moment from "moment";
import { type Adapter } from "@time-provider/core";

export class TimeAdapter implements Adapter<moment.Moment> {
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
