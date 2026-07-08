import { BaseTimeAdapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/plugin/utc.js";

export class TimeAdapter extends BaseTimeAdapter<Dayjs> {
  localNow(): Dayjs {
    return dayjs();
  }
  utcNow(): Dayjs {
    return dayjs.utc();
  }
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(time);
  }
}
