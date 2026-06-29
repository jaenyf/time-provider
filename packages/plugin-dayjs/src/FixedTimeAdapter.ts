import { BaseFixedTimeAdapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";

export class FixedTimeAdapter extends BaseFixedTimeAdapter<Dayjs> {
  createFixedTime(fixedDate: string | number | Dayjs): Dayjs {
    return dayjs(fixedDate);
  }
}
