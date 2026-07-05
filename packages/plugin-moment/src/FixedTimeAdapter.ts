import { BaseDeterministicTimeAdapter } from "@time-provider/core";
import moment, { type Moment } from "moment";

export class FixedTimeAdapter extends BaseDeterministicTimeAdapter<Moment> {
  protected createDeterminedTime(fixedDate: string | number | Moment): Moment {
    return moment(fixedDate);
  }
}
