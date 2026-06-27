import { TimeAdapter } from "./TimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import { Dayjs } from "dayjs";

export function createTimeAdapter(): TimeAdapter {
  return new TimeAdapter();
}

export function createFixedTimeAdapter(input: number | string | Dayjs): TimeAdapter {
  return new FixedTimeAdapter(input);
}
