import { BaseSequentialTimeAdapter } from "@time-provider/core";

export class SequentialTimeAdapter extends BaseSequentialTimeAdapter<Date> {
  protected convertToDateImpl(time: string | number | Date): Date {
    return new Date(time);
  }
}
