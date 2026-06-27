import { TimeAdapter } from "./TimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import type { DateTime } from "luxon";

export function createTimeAdapter(): TimeAdapter {
  return new TimeAdapter();
}

export function createFixedTimeAdapter(input: number | string | DateTime): TimeAdapter {
  return new FixedTimeAdapter(input);
}
