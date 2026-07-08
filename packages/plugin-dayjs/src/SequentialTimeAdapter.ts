import { BaseSequentialTimeAdapter } from "@time-provider/core";
import dayjs, { Dayjs } from "dayjs";

export class SequentialTimeAdapter extends BaseSequentialTimeAdapter<Dayjs> {
  protected convertToDateImpl(determinedTime: string | number | dayjs.Dayjs): dayjs.Dayjs {
    return dayjs(determinedTime);
  }
}
