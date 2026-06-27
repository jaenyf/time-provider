import { TimeAdapter } from "./TimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";

export function createTimeAdapter(): TimeAdapter {
  return new TimeAdapter();
}

export function createFixedTimeAdapter(input: number | string | Date): TimeAdapter {
  return new FixedTimeAdapter(input);
}
