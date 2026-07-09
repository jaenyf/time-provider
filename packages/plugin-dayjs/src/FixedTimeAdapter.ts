import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Dayjs> {
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(time);
  }
}
