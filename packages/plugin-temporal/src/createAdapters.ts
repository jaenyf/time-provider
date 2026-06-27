import { TimeAdapter } from "./TimeAdapter.ts";
import { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import type { Temporal } from "@js-temporal/polyfill";

export function createTimeAdapter(): TimeAdapter {
  return new TimeAdapter();
}

export function createFixedTimeAdapter(input: number | string | Temporal.Instant): TimeAdapter {
  return new FixedTimeAdapter(input);
}
