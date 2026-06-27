import dayjs, { Dayjs } from "dayjs";
import "dayjs/plugin/utc.js";
import { type Adapter } from "@time-provider/core";

export class TimeAdapter implements Adapter<Dayjs> {
  localNow(): Dayjs {
    return dayjs();
  }
  utcNow(): Dayjs {
    return dayjs.utc();
  }
  parse(initialValue: string | number | Dayjs): Dayjs {
    return dayjs(initialValue);
  }
}
