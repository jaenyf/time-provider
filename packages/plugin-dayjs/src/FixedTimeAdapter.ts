import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Dayjs> {
  constructor(time: string | number | dayjs.Dayjs) {
    super(time);
  }
  protected convertToDateImpl(time: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(time);
  }
}
